import type { SoundGenerator } from '../types'

export const error: SoundGenerator = (ctx, dest, theme) => {
  const now = ctx.currentTime
  const duration = 0.15 * theme.decay

  // Low buzz with pitch drop for "thud" feel
  const osc = ctx.createOscillator()
  osc.type = theme.oscType
  osc.frequency.setValueAtTime(280 * (theme.baseFreq / 440), now)
  osc.frequency.exponentialRampToValueAtTime(180 * (theme.baseFreq / 440), now + duration)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.25, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  osc.connect(gain)
  gain.connect(dest)
  osc.start(now)
  osc.stop(now + duration)

  // Noise thud through lowpass
  const noiseDuration = 0.1 * theme.decay
  const bufSize = Math.floor(ctx.sampleRate * noiseDuration)
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1

  const noise = ctx.createBufferSource()
  noise.buffer = buf

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 600

  const nGain = ctx.createGain()
  nGain.gain.setValueAtTime(0.15, now)
  nGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDuration)

  noise.connect(filter)
  filter.connect(nGain)
  nGain.connect(dest)
  noise.start(now)
  noise.stop(now + noiseDuration)
}
