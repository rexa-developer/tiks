import type { SoundGenerator } from '../types'
import { createNoiseSource, startTime } from './_util'

export const error: SoundGenerator = (ctx, dest, theme) => {
  const now = startTime(ctx)
  const duration = Math.max(0.15 * theme.decay, 0.005)

  // Low buzz with pitch drop for "thud" feel
  const osc = ctx.createOscillator()
  osc.type = theme.oscType
  osc.frequency.setValueAtTime(280 * (theme.baseFreq / 440), now)
  osc.frequency.exponentialRampToValueAtTime(180 * (theme.baseFreq / 440), now + duration)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.001, now)
  gain.gain.linearRampToValueAtTime(0.25, now + theme.attack)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  osc.connect(gain)
  gain.connect(dest)
  osc.start(now)
  osc.stop(now + duration)

  // Noise thud through lowpass
  const noiseDuration = Math.max(0.1 * theme.decay, 0.005)
  const noise = createNoiseSource(ctx, theme)

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 600

  const nGain = ctx.createGain()
  nGain.gain.setValueAtTime(0.15, now)
  nGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDuration)

  noise.connect(filter)
  filter.connect(nGain)
  nGain.connect(dest)
  noise.start(now)
  noise.stop(now + noiseDuration)
}
