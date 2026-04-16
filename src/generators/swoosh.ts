import type { SoundGenerator } from '../types'
import { createNoiseSource } from './_util'

export const swoosh: SoundGenerator = (ctx, dest, theme) => {
  const now = ctx.currentTime
  const duration = Math.max(0.12 * theme.decay, 0.005)

  const noise = createNoiseSource(ctx, theme)

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = theme.filterQ
  filter.frequency.setValueAtTime(theme.filterFreq * 2, now)
  filter.frequency.exponentialRampToValueAtTime(Math.max(theme.filterFreq * 0.3, 20), now + duration)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.2, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  noise.connect(filter)
  filter.connect(gain)
  gain.connect(dest)

  noise.start(now)
  noise.stop(now + duration)
}
