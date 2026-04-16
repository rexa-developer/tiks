import type { SoundGenerator } from '../types'
import { createNoiseSource } from './_util'

export const click: SoundGenerator = (ctx, dest, theme) => {
  const now = ctx.currentTime
  const duration = Math.max(0.03 * theme.decay, 0.005)

  const noise = createNoiseSource(ctx, theme)

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = theme.filterFreq
  filter.Q.value = theme.filterQ

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.001, now)
  gain.gain.linearRampToValueAtTime(0.3, now + Math.min(theme.attack, duration * 0.5))
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  noise.connect(filter)
  filter.connect(gain)
  gain.connect(dest)

  noise.start(now)
  noise.stop(now + duration)
}
