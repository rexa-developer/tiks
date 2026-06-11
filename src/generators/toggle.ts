import type { SoundGenerator } from '../types'
import { createNoiseSource, startTime } from './_util'

// Pitch snap with a noise transient. On rises 0.8x → 1.2x; off falls
// 1.0x → 0.6x (ending below on's peak so the pair reads as open/close).
const makeToggle = (startRatio: number, endRatio: number): SoundGenerator =>
  (ctx, dest, theme) => {
    const now = startTime(ctx)
    const duration = Math.max(0.06 * theme.decay, 0.005)

    const osc = ctx.createOscillator()
    osc.type = theme.oscType
    osc.frequency.setValueAtTime(theme.baseFreq * startRatio, now)
    osc.frequency.exponentialRampToValueAtTime(theme.baseFreq * endRatio, now + duration)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.001, now)
    gain.gain.linearRampToValueAtTime(0.75, now + theme.attack)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

    osc.connect(gain)
    gain.connect(dest)

    osc.start(now)
    osc.stop(now + duration)

    // Noise transient
    const noiseDuration = Math.max(0.01 * theme.decay, 0.005)
    const noise = createNoiseSource(ctx, theme)

    const nGain = ctx.createGain()
    nGain.gain.setValueAtTime(0.24, now)
    nGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDuration)

    noise.connect(nGain)
    nGain.connect(dest)
    noise.start(now)
    noise.stop(now + noiseDuration)
  }

export const toggleOn = makeToggle(0.8, 1.2)
export const toggleOff = makeToggle(1.0, 0.6)
