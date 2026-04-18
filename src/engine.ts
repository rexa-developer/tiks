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

    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioCtxCtor()
      this.masterGain = this.ctx.createGain()
      this.masterGain.connect(this.ctx.destination)
    }

    if (options?.volume !== undefined) this._volume = Math.max(0, Math.min(1, options.volume))
    this.masterGain!.gain.value = this._volume

    if (options?.muted) this._muted = true

    if (options?.respectReducedMotion) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      if (mq.matches) this._muted = true
    }

    this.bindLifecycle()
    this.bindGestureUnlock()

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
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

  // iOS Safari keeps AudioContexts locked until a node is actually started
  // inside a user gesture. Attach one listener that fires a silent 1-sample
  // buffer on the next gesture and unbinds itself once ctx.state === 'running'.
  private bindGestureUnlock() {
    if (this._unlockBound) return
    if (typeof document === 'undefined') return
    this._unlockBound = true

    let unlocking = false
    const unlock = () => {
      const c = this.ctx
      if (!c) return
      if (unlocking) return
      unlocking = true
      if (c.state === 'suspended') {
        c.resume().then(
          () => { if (c.state === 'running') this._unlockTeardown?.() },
          () => { unlocking = false },
        )
      }
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

  private ensureContext(): AudioContext | null {
    if (!AudioCtxCtor) return null
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioCtxCtor()
      this.masterGain = this.ctx.createGain()
      this.masterGain.connect(this.ctx.destination)
      this.masterGain.gain.value = this._volume
    }
    return this.ctx
  }

  playSound(generator: SoundGenerator, theme: TiksTheme) {
    if (this._muted) return
    const ctx = this.ensureContext()
    if (!ctx || !this.masterGain) return

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
      // On Safari, starting nodes on a suspended context is silent. Bail
      // instead of faking playback — the gesture unlock handler is already
      // installed and will flip the context to 'running' for the next call.
      // (On Chrome, resume() can flip state synchronously; re-read to check.)
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
