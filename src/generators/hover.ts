import type { SoundGenerator } from '../types'
import { createNoiseSource } from './_util'

export const hover: SoundGenerator = (ctx, dest, theme) => {
  const now = ctx.currentTime
  const duration = Math.max(0.015 * theme.decay, 0.005)

  const noise = createNoiseSource(ctx, theme)

  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = theme.brightness

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.05, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  noise.connect(filter)
  filter.connect(gain)
  gain.connect(dest)

  noise.start(now)
  noise.stop(now + duration)
}
