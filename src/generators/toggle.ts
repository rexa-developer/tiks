import type { SoundGenerator } from '../types'

export const toggleOn: SoundGenerator = (ctx, dest, theme) => {
  const now = ctx.currentTime
  const duration = 0.06 * theme.decay

  // Rising sine
  const osc = ctx.createOscillator()
  osc.type = theme.oscType
  osc.frequency.setValueAtTime(theme.baseFreq, now)
  osc.frequency.exponentialRampToValueAtTime(theme.baseFreq * 1.5, now + duration)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.25, now + theme.attack)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  osc.connect(gain)
  gain.connect(dest)

  osc.start(now)
  osc.stop(now + duration)

  // Noise transient
  const bufSize = Math.floor(ctx.sampleRate * 0.01)
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1

  const noise = ctx.createBufferSource()
  noise.buffer = buf

  const nGain = ctx.createGain()
  nGain.gain.setValueAtTime(0.08, now)
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.01)

  noise.connect(nGain)
  nGain.connect(dest)
  noise.start(now)
  noise.stop(now + 0.01)
}

export const toggleOff: SoundGenerator = (ctx, dest, theme) => {
  const now = ctx.currentTime
  const duration = 0.06 * theme.decay

  // Falling sine
  const osc = ctx.createOscillator()
  osc.type = theme.oscType
  osc.frequency.setValueAtTime(theme.baseFreq * 1.2, now)
  osc.frequency.exponentialRampToValueAtTime(theme.baseFreq * 0.7, now + duration)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.25, now + theme.attack)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  osc.connect(gain)
  gain.connect(dest)

  osc.start(now)
  osc.stop(now + duration)

  // Noise transient
  const bufSize = Math.floor(ctx.sampleRate * 0.01)
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1

  const noise = ctx.createBufferSource()
  noise.buffer = buf

  const nGain = ctx.createGain()
  nGain.gain.setValueAtTime(0.08, now)
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.01)

  noise.connect(nGain)
  nGain.connect(dest)
  noise.start(now)
  noise.stop(now + 0.01)
}
