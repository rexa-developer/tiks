import type { SoundGenerator } from '../types'

export const warning: SoundGenerator = (ctx, dest, theme) => {
  const now = ctx.currentTime
  const noteDuration = Math.max(0.07 * theme.decay, 0.005)
  const gap = Math.max(0.1 * theme.decay, 0.01)
  const baseFreq = theme.baseFreq * 1.2

  // Two bursts: second rises a minor second (ratio 1.0595) for questioning tone
  for (let i = 0; i < 2; i++) {
    const t = now + i * gap
    const osc = ctx.createOscillator()
    osc.type = theme.oscType
    osc.frequency.value = i === 0 ? baseFreq : baseFreq * 1.0595

    const attack = Math.min(theme.attack, noteDuration * 0.5)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.001, t)
    gain.gain.linearRampToValueAtTime(0.25, t + attack)
    gain.gain.exponentialRampToValueAtTime(0.001, t + noteDuration)

    osc.connect(gain)
    gain.connect(dest)
    osc.start(t)
    osc.stop(t + noteDuration)
  }
}
