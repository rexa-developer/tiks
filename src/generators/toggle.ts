import type { SoundGenerator } from '../types'
import { createNoiseSource, startTime } from './_util'

export const toggleOn: SoundGenerator = (ctx, dest, theme) => {
  const now = startTime(ctx)
  const duration = Math.max(0.06 * theme.decay, 0.005)

  // Rising sine: 0.8x → 1.2x
  const osc = ctx.createOscillator()
  osc.type = theme.oscType
  osc.frequency.setValueAtTime(theme.baseFreq * 0.8, now)
  osc.frequency.exponentialRampToValueAtTime(theme.baseFreq * 1.2, now + duration)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.001, now)
  gain.gain.linearRampToValueAtTime(0.25, now + theme.attack)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  osc.connect(gain)
  gain.connect(dest)

  osc.start(now)
  osc.stop(now + duration)

  // Noise transient
  const noiseDuration = Math.max(0.01 * theme.decay, 0.005)
  const noise = createNoiseSource(ctx, theme)

  const nGain = ctx.createGain()
  nGain.gain.setValueAtTime(0.08, now)
  nGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDuration)

  noise.connect(nGain)
  nGain.connect(dest)
  noise.start(now)
  noise.stop(now + noiseDuration)
}

export const toggleOff: SoundGenerator = (ctx, dest, theme) => {
  const now = startTime(ctx)
  const duration = Math.max(0.06 * theme.decay, 0.005)

  // Falling sine: 1.0x → 0.6x (ends below toggleOn's 1.2x peak)
  const osc = ctx.createOscillator()
  osc.type = theme.oscType
  osc.frequency.setValueAtTime(theme.baseFreq, now)
  osc.frequency.exponentialRampToValueAtTime(theme.baseFreq * 0.6, now + duration)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.001, now)
  gain.gain.linearRampToValueAtTime(0.25, now + theme.attack)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  osc.connect(gain)
  gain.connect(dest)

  osc.start(now)
  osc.stop(now + duration)

  // Noise transient
  const noiseDuration = Math.max(0.01 * theme.decay, 0.005)
  const noise = createNoiseSource(ctx, theme)

  const nGain = ctx.createGain()
  nGain.gain.setValueAtTime(0.08, now)
  nGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDuration)

  noise.connect(nGain)
  nGain.connect(dest)
  noise.start(now)
  noise.stop(now + noiseDuration)
}
