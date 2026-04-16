import type { SoundGenerator } from '../types'

export const toggleOn: SoundGenerator = (ctx, dest, theme) => {
  const now = ctx.currentTime
  const duration = Math.max(0.06 * theme.decay, 0.005)

  // Rising sine
  const osc = ctx.createOscillator()
  osc.type = theme.oscType
  osc.frequency.setValueAtTime(theme.baseFreq, now)
  osc.frequency.exponentialRampToValueAtTime(theme.baseFreq * 1.5, now + duration)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.001, now)
  gain.gain.linearRampToValueAtTime(0.25, now + theme.attack)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  osc.connect(gain)
  gain.connect(dest)

  osc.start(now)
  osc.stop(now + duration)

  // Noise transient
  const noiseDuration = Math.max(0.01, 0.005)
  const bufSize = Math.max(Math.floor(ctx.sampleRate * noiseDuration), 1)
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1

  const noise = ctx.createBufferSource()
  noise.buffer = buf

  const nGain = ctx.createGain()
  nGain.gain.setValueAtTime(0.08, now)
  nGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDuration)

  noise.connect(nGain)
  nGain.connect(dest)
  noise.start(now)
  noise.stop(now + noiseDuration)
}

export const toggleOff: SoundGenerator = (ctx, dest, theme) => {
  const now = ctx.currentTime
  const duration = Math.max(0.06 * theme.decay, 0.005)

  // Falling sine
  const osc = ctx.createOscillator()
  osc.type = theme.oscType
  osc.frequency.setValueAtTime(theme.baseFreq * 1.2, now)
  osc.frequency.exponentialRampToValueAtTime(theme.baseFreq * 0.7, now + duration)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.001, now)
  gain.gain.linearRampToValueAtTime(0.25, now + theme.attack)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  osc.connect(gain)
  gain.connect(dest)

  osc.start(now)
  osc.stop(now + duration)

  // Noise transient
  const noiseDuration = Math.max(0.01, 0.005)
  const bufSize = Math.max(Math.floor(ctx.sampleRate * noiseDuration), 1)
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1

  const noise = ctx.createBufferSource()
  noise.buffer = buf

  const nGain = ctx.createGain()
  nGain.gain.setValueAtTime(0.08, now)
  nGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDuration)

  noise.connect(nGain)
  nGain.connect(dest)
  noise.start(now)
  noise.stop(now + noiseDuration)
}
