import type { SoundGenerator } from '../types'

export const warning: SoundGenerator = (ctx, dest, theme) => {
  const now = ctx.currentTime
  const noteDuration = 0.07 * theme.decay
  const gap = 0.1 * theme.decay
  const freq = theme.baseFreq * 1.2 // Slightly higher than base for urgency

  // Two distinct bursts at same pitch
  for (let i = 0; i < 2; i++) {
    const t = now + i * gap
    const osc = ctx.createOscillator()
    osc.type = theme.oscType
    osc.frequency.value = freq

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.001, t)
    gain.gain.linearRampToValueAtTime(0.25, t + theme.attack)
    gain.gain.exponentialRampToValueAtTime(0.001, t + noteDuration)

    osc.connect(gain)
    gain.connect(dest)
    osc.start(t)
    osc.stop(t + noteDuration)
  }
}
