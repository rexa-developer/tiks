import type { SoundGenerator } from '../types'

export const pop: SoundGenerator = (ctx, dest, theme) => {
  const now = ctx.currentTime
  const duration = Math.max(0.08 * theme.decay, 0.005)
  const scale = theme.baseFreq / 440

  const osc = ctx.createOscillator()
  osc.type = theme.oscType
  osc.frequency.setValueAtTime(800 * scale, now)
  osc.frequency.exponentialRampToValueAtTime(200 * scale, now + duration)

  const attack = Math.min(theme.attack, duration * 0.2)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.001, now)
  gain.gain.linearRampToValueAtTime(0.3, now + attack)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  osc.connect(gain)
  gain.connect(dest)

  osc.start(now)
  osc.stop(now + duration)
}
