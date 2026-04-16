import type { SoundGenerator } from '../types'

export const hover: SoundGenerator = (ctx, dest, theme) => {
  const now = ctx.currentTime
  const duration = Math.max(0.015 * theme.decay, 0.005)

  const bufSize = Math.max(Math.floor(ctx.sampleRate * duration), 1)
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1

  const noise = ctx.createBufferSource()
  noise.buffer = buf

  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = theme.brightness

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.05, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  noise.connect(filter)
  filter.connect(gain)
  gain.connect(dest)

  noise.start(now)
  noise.stop(now + duration)
}
