import type { SoundGenerator } from '../types'

export const swoosh: SoundGenerator = (ctx, dest, theme) => {
  const now = ctx.currentTime
  const duration = 0.12 * theme.decay

  const bufSize = Math.floor(ctx.sampleRate * duration)
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1

  const noise = ctx.createBufferSource()
  noise.buffer = buf

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = theme.filterQ
  filter.frequency.setValueAtTime(theme.filterFreq * 2, now)
  filter.frequency.exponentialRampToValueAtTime(theme.filterFreq * 0.3, now + duration)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.2, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  noise.connect(filter)
  filter.connect(gain)
  gain.connect(dest)

  noise.start(now)
  noise.stop(now + duration)
}
