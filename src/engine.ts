import type { SoundGenerator, TiksOptions, TiksTheme } from './types'

const AudioCtxCtor: typeof AudioContext | undefined =
  typeof window !== 'undefined'
    ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
    : undefined

const GESTURE_EVENTS = ['pointerdown', 'touchstart', 'mousedown', 'keydown'] as const

class AudioEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private _muted = false
  private _volume = 0.3
  private _lifecycleBound = false
  private _unlockBound = false
  private _unlockTeardown: (() => void) | null = null

  init(options?: TiksOptions) {
    if (!AudioCtxCtor) return

    if (options?.volume !== undefined) this._volume = Math.max(0, Math.min(1, options.volume))
    if (this.masterGain) this.masterGain.gain.value = this._volume

    if (options?.muted) this._muted = true

    if (options?.respectReducedMotion) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      if (mq.matches) this._muted = true
    }

    this.bindLifecycle()
    this.bindGestureUnlock()
  }

  private createContext(): AudioContext | null {
    if (!AudioCtxCtor) return null
    if (this.ctx && this.ctx.state !== 'closed') return this.ctx
    this.ctx = new AudioCtxCtor()
    this.masterGain = this.ctx.createGain()
    this.masterGain.connect(this.ctx.destination)
    this.masterGain.gain.value = this._volume
    return this.ctx
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
          () => { if (c.state === 'running') this._unlockTeardown?.() },
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
    if (this._muted) return
    // No context yet means no gesture has happened. Bail silently — a hover
    // sound triggered before any user interaction can't play under autoplay
    // policy anyway, and constructing a context here would re-introduce the
    // "AudioContext was not allowed to start" warning.
    const ctx = this.ctx
    if (!ctx || !this.masterGain) return

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
      if ((ctx.state as AudioContextState) !== 'running') return
    }

    generator(ctx, this.masterGain, theme)
  }

  mute() {
    this._muted = true
  }

  unmute() {
    this._muted = false
  }

  isMuted(): boolean {
    return this._muted
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
