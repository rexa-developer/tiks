import type { SoundGenerator } from '../types'

export const notify: SoundGenerator = (ctx, dest, theme) => {
  const now = ctx.currentTime
  const duration = Math.max(0.3 * theme.decay, 0.005)

  // Primary tone
  const osc1 = ctx.createOscillator()
  osc1.type = theme.oscType
  osc1.frequency.value = theme.baseFreq * 2

  const gain1 = ctx.createGain()
  gain1.gain.setValueAtTime(0.001, now)
  gain1.gain.linearRampToValueAtTime(0.2, now + theme.attack)
  gain1.gain.exponentialRampToValueAtTime(0.001, now + duration)

  osc1.connect(gain1)
  gain1.connect(dest)
  osc1.start(now)
  osc1.stop(now + duration)

  // Harmonic
  const harmonicDuration = Math.max(duration * 0.7, 0.005)
  const osc2 = ctx.createOscillator()
  osc2.type = theme.oscType
  osc2.frequency.value = theme.baseFreq * 3

  const gain2 = ctx.createGain()
  gain2.gain.setValueAtTime(0.001, now)
  gain2.gain.linearRampToValueAtTime(0.08, now + theme.attack)
  gain2.gain.exponentialRampToValueAtTime(0.001, now + harmonicDuration)

  osc2.connect(gain2)
  gain2.connect(dest)
  osc2.start(now)
  osc2.stop(now + harmonicDuration)
}
