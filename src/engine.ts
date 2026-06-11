import type { SoundGenerator, TiksOptions, TiksTheme } from './types'

const AudioCtxCtor: typeof AudioContext | undefined =
  typeof window !== 'undefined'
    ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
    : undefined

const GESTURE_EVENTS = ['pointerdown', 'touchstart', 'mousedown', 'keydown'] as const

class AudioEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private limiter: DynamicsCompressorNode | null = null
  private _muted = false
  private _respectReducedMotion = true      // policy: should the preference mute us?
  private _reducedMotionPreferred = false   // raw OS preference, tracked by the listener
  private _volume = 0.3
  private _lifecycleBound = false
  private _unlockBound = false
  private _reducedMotionBound = false
  private _unlockTeardown: (() => void) | null = null
  private _hoverThrottleMs = 80
  private _lastHoverAt = -Infinity

  init(options?: TiksOptions) {
    if (!AudioCtxCtor) return

    if (options?.volume !== undefined) this._volume = Math.max(0, Math.min(1, options.volume))
    if (this.masterGain) this.masterGain.gain.value = this._volume

    if (options?.muted !== undefined) this._muted = options.muted

    if (options?.hoverThrottleMs !== undefined) {
      this._hoverThrottleMs = Math.max(0, options.hoverThrottleMs)
    }

    if (options?.respectReducedMotion !== undefined) {
      this._respectReducedMotion = options.respectReducedMotion
    }
    this.bindReducedMotion()
    this.bindLifecycle()
    this.bindGestureUnlock()
  }

  private createContext(): AudioContext | null {
    if (!AudioCtxCtor) return null
    if (this.ctx && this.ctx.state !== 'closed') return this.ctx
    this.ctx = new AudioCtxCtor()
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = this._volume

    // Transparent safety limiter: prevents hard clipping when many short
    // sounds overlap during rapid interaction. Single sounds peak well below
    // the -3 dB threshold, so it stays inactive during normal use.
    this.limiter = this.ctx.createDynamicsCompressor()
    this.limiter.threshold.value = -3
    this.limiter.knee.value = 0
    this.limiter.ratio.value = 20
    this.limiter.attack.value = 0.003
    this.limiter.release.value = 0.1

    this.masterGain.connect(this.limiter)
    this.limiter.connect(this.ctx.destination)
    return this.ctx
  }

  // prefers-reduced-motion is respected by default. The listener is bound once
  // and tracks the raw OS preference in _reducedMotionPreferred. Whether that
  // preference actually mutes playback is controlled separately by
  // _respectReducedMotion (the policy). This split means unmute() never
  // re-enables sound the user asked to suppress, and an explicit
  // respectReducedMotion: false opt-out is always honored regardless of init order.
  private bindReducedMotion() {
    if (this._reducedMotionBound) return
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    this._reducedMotionBound = true

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => { this._reducedMotionPreferred = mq.matches }
    apply()
    mq.addEventListener('change', apply)
  }

  private bindLifecycle() {
    if (this._lifecycleBound) return
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    this._lifecycleBound = true

    const resume = () => {
      const c = this.ctx
      if (c && c.state === 'suspended') c.resume().catch(() => {})
    }
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') resume()
    })
    window.addEventListener('pageshow', resume)
  }

  // Construct the AudioContext lazily on the first qualifying user gesture.
  // Creating it eagerly (e.g. inside init() during page load) trips Chrome's
  // "AudioContext was not allowed to start" warning and leaves the context
  // suspended until a gesture arrives. By deferring construction, the context
  // is born in 'running' state and the very next pointerenter / hover plays.
  private bindGestureUnlock() {
    if (this._unlockBound) return
    if (typeof document === 'undefined') return
    this._unlockBound = true

    let unlocking = false
    const unlock = () => {
      if (unlocking) return
      unlocking = true
      const c = this.createContext()
      if (!c) return
      if (c.state === 'suspended') {
        c.resume().then(
          () => {
            if (c.state === 'running') this._unlockTeardown?.()
            else unlocking = false
          },
          () => { unlocking = false },
        )
      }
      // iOS Safari additionally needs a node started inside the gesture.
      try {
        const src = c.createBufferSource()
        src.buffer = c.createBuffer(1, 1, 22050)
        src.connect(c.destination)
        src.start(0)
      } catch {}
      if (c.state === 'running') this._unlockTeardown?.()
    }

    const opts = { capture: true, passive: true } as AddEventListenerOptions
    for (const evt of GESTURE_EVENTS) {
      document.addEventListener(evt, unlock, opts)
    }
    this._unlockTeardown = () => {
      for (const evt of GESTURE_EVENTS) {
        document.removeEventListener(evt, unlock, opts)
      }
      this._unlockTeardown = null
    }
  }

  getContext(): AudioContext | null {
    return this.ctx
  }

  getMasterGain(): GainNode | null {
    return this.masterGain
  }

  playSound(generator: SoundGenerator, theme: TiksTheme) {
    if (this._muted || (this._respectReducedMotion && this._reducedMotionPreferred)) return
    // No context yet means no gesture has happened. Bail silently — a hover
    // sound triggered before any user interaction can't play under autoplay
    // policy anyway, and constructing a context here would re-introduce the
    // "AudioContext was not allowed to start" warning.
    const ctx = this.ctx
    const master = this.masterGain
    if (!ctx || !master) return

    // resume() is async; checking ctx.state synchronously right after would
    // always read 'suspended' and drop the sound (e.g. the first sound after a
    // tab-visibility restore). Schedule it once resume resolves instead.
    if (ctx.state === 'suspended') {
      ctx.resume().then(
        () => { if (ctx.state === 'running') generator(ctx, master, theme) },
        () => {},
      )
      return
    }

    generator(ctx, master, theme)
  }

  // hover() fires on every pointer pass; gate it to one tick per interval so
  // dense UIs can't machine-gun the sound (README told users to debounce —
  // now the engine does).
  playHover(generator: SoundGenerator, theme: TiksTheme) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    if (now - this._lastHoverAt < this._hoverThrottleMs) return
    this._lastHoverAt = now
    this.playSound(generator, theme)
  }

  mute() {
    this._muted = true
  }

  unmute() {
    this._muted = false
  }

  isMuted(): boolean {
    return this._muted || (this._respectReducedMotion && this._reducedMotionPreferred)
  }

  setVolume(v: number) {
    this._volume = Math.max(0, Math.min(1, v))
    if (this.masterGain) {
      this.masterGain.gain.value = this._volume
    }
  }

  getVolume(): number {
    return this._volume
  }
}

export const audioEngine = new AudioEngine()
