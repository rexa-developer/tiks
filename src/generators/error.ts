import type { SoundGenerator } from '../types'

export const error: SoundGenerator = (ctx, dest, theme) => {
  const now = ctx.currentTime
  const duration = 0.12 * theme.decay

  // Low triangle buzz
  const osc = ctx.createOscillator()
  osc.type = 'triangle'
  osc.frequency.value = 150 * (theme.baseFreq / 440)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.2, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  osc.connect(gain)
  gain.connect(dest)
  osc.start(now)
  osc.stop(now + duration)

  // Noise thud through lowpass
  const bufSize = Math.floor(ctx.sampleRate * 0.08 * theme.decay)
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1

  const noise = ctx.createBufferSource()
  noise.buffer = buf

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 500

  const nGain = ctx.createGain()
  nGain.gain.setValueAtTime(0.1, now)
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08 * theme.decay)

  noise.connect(filter)
  filter.connect(nGain)
  nGain.connect(dest)
  noise.start(now)
  noise.stop(now + 0.08 * theme.decay)
}
