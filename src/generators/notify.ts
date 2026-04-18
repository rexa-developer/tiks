import type { SoundGenerator } from '../types'
import { startTime } from './_util'

export const notify: SoundGenerator = (ctx, dest, theme) => {
  const now = startTime(ctx)
  const dur1 = Math.max(0.18 * theme.decay, 0.005)
  const dur2 = Math.max(0.3 * theme.decay, 0.005)
  const delay = Math.max(0.1 * theme.decay, 0.02)

  // First note: tonic octave
  const osc1 = ctx.createOscillator()
  osc1.type = theme.oscType
  osc1.frequency.value = theme.baseFreq * 2

  const gain1 = ctx.createGain()
  gain1.gain.setValueAtTime(0.001, now)
  gain1.gain.linearRampToValueAtTime(0.2, now + theme.attack)
  gain1.gain.exponentialRampToValueAtTime(0.001, now + dur1)

  osc1.connect(gain1)
  gain1.connect(dest)
  osc1.start(now)
  osc1.stop(now + dur1)

  // Second note: fifth above, rising figure
  const t2 = now + delay
  const osc2 = ctx.createOscillator()
  osc2.type = theme.oscType
  osc2.frequency.value = theme.baseFreq * 3

  const gain2 = ctx.createGain()
  gain2.gain.setValueAtTime(0.001, t2)
  gain2.gain.linearRampToValueAtTime(0.2, t2 + theme.attack)
  gain2.gain.exponentialRampToValueAtTime(0.001, t2 + dur2)

  osc2.connect(gain2)
  gain2.connect(dest)
  osc2.start(t2)
  osc2.stop(t2 + dur2)
}
