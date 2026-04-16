import type { SoundGenerator } from '../types'

export const click: SoundGenerator = (ctx, dest, theme) => {
  const now = ctx.currentTime
  const duration = Math.max(0.03 * theme.decay, 0.005)

  const bufferSize = Math.max(Math.floor(ctx.sampleRate * duration), 1)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }

  const noise = ctx.createBufferSource()
  noise.buffer = buffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = theme.filterFreq
  filter.Q.value = theme.filterQ

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.001, now)
  gain.gain.linearRampToValueAtTime(0.3, now + Math.min(theme.attack, duration * 0.5))
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  noise.connect(filter)
  filter.connect(gain)
  gain.connect(dest)

  noise.start(now)
  noise.stop(now + duration)
}
