import type { SoundGenerator } from '../types'

export const warning: SoundGenerator = (ctx, dest, theme) => {
  const now = ctx.currentTime
  const noteDuration = 0.04 * theme.decay
  const gap = 0.06 * theme.decay

  // Two short bursts at same pitch
  for (let i = 0; i < 2; i++) {
    const t = now + i * gap
    const osc = ctx.createOscillator()
    osc.type = theme.oscType
    osc.frequency.value = theme.baseFreq

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.001, t)
    gain.gain.linearRampToValueAtTime(0.2, t + theme.attack)
    gain.gain.exponentialRampToValueAtTime(0.001, t + noteDuration)

    osc.connect(gain)
    gain.connect(dest)
    osc.start(t)
    osc.stop(t + noteDuration)
  }
}
