import type { SoundGenerator } from '../types'

export const success: SoundGenerator = (ctx, dest, theme) => {
  const now = ctx.currentTime
  const scale = theme.baseFreq / 440

  // First note: C5 (523Hz scaled)
  const osc1 = ctx.createOscillator()
  osc1.type = theme.oscType
  osc1.frequency.value = 523 * scale

  const gain1 = ctx.createGain()
  gain1.gain.setValueAtTime(0.001, now)
  gain1.gain.linearRampToValueAtTime(0.25, now + theme.attack)
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1 * theme.decay)

  osc1.connect(gain1)
  gain1.connect(dest)
  osc1.start(now)
  osc1.stop(now + 0.1 * theme.decay)

  // Second note: G5 (784Hz scaled), delayed 80ms
  const delay = 0.08 * theme.decay
  const osc2 = ctx.createOscillator()
  osc2.type = theme.oscType
  osc2.frequency.value = 784 * scale

  const gain2 = ctx.createGain()
  gain2.gain.setValueAtTime(0.001, now + delay)
  gain2.gain.linearRampToValueAtTime(0.25, now + delay + theme.attack)
  gain2.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.15 * theme.decay)

  osc2.connect(gain2)
  gain2.connect(dest)
  osc2.start(now + delay)
  osc2.stop(now + delay + 0.15 * theme.decay)
}
