import type { SoundGenerator, TiksOptions, TiksTheme } from './types'

class AudioEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private _muted = false
  private _volume = 0.3

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
  }

  getContext(): AudioContext | null {
    return this.ctx
  }

  getMasterGain(): GainNode | null {
    return this.masterGain
  }

  ensureContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.connect(this.ctx.destination)
      this.masterGain.gain.value = this._volume
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
    return this.ctx
  }

  playSound(generator: SoundGenerator, theme: TiksTheme) {
    if (this._muted) return
    const ctx = this.ensureContext()
    if (!this.masterGain) return
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
