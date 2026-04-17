import type { SoundGenerator, TiksOptions, TiksTheme } from './types'

class AudioEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private _muted = false
  private _volume = 0.3
  private _lifecycleBound = false

  init(options?: TiksOptions) {
    // Reuse existing context instead of leaking a new one
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext()
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

    // Attempt resume; if called outside a gesture (iOS), playSound will retry
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
  }

  // Browsers suspend AudioContexts on tab-away and on bfcache store.
  // On restore (pageshow.persisted or visibilitychange→visible), resume.
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

  getContext(): AudioContext | null {
    return this.ctx
  }

  getMasterGain(): GainNode | null {
    return this.masterGain
  }

  private ensureContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.connect(this.ctx.destination)
      this.masterGain.gain.value = this._volume
    }
    return this.ctx
  }

  playSound(generator: SoundGenerator, theme: TiksTheme) {
    if (this._muted) return
    const ctx = this.ensureContext()
    if (!this.masterGain) return

    // iOS Safari: resume() called outside a user gesture is a silent no-op.
    // The current call is (usually) inside a gesture handler, so re-attempt
    // resume whenever the context is still suspended. Play regardless — on
    // bfcache restore resume() can reject, but starting nodes inside a gesture
    // often wakes the context anyway.
    if (ctx.state === 'suspended') {
      const play = () => generator(ctx, this.masterGain!, theme)
      ctx.resume().then(play, play)
    } else {
      generator(ctx, this.masterGain, theme)
    }
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
