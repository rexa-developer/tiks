import type { SoundGenerator } from '../types'
import { createNoiseSource, startTime } from './_util'

export const swoosh: SoundGenerator = (ctx, dest, theme) => {
  const now = startTime(ctx)
  const duration = Math.max(0.12 * theme.decay, 0.005)

  const noise = createNoiseSource(ctx, theme)

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = theme.filterQ
  filter.frequency.setValueAtTime(theme.filterFreq * 2, now)
  filter.frequency.exponentialRampToValueAtTime(Math.max(theme.filterFreq * 0.3, 20), now + duration)

  const attack = Math.min(theme.attack * 2, duration * 0.1)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.001, now)
  gain.gain.linearRampToValueAtTime(0.2, now + attack)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  noise.connect(filter)
  filter.connect(gain)
  gain.connect(dest)

  noise.start(now)
  noise.stop(now + duration)
}
