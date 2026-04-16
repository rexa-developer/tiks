let whiteBuffer: AudioBuffer | null = null
let pinkBuffer: AudioBuffer | null = null

export function getWhiteNoise(ctx: AudioContext): AudioBuffer {
  if (whiteBuffer) return whiteBuffer
  const length = ctx.sampleRate * 0.5
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1
  }
  whiteBuffer = buffer
  return buffer
}

export function getPinkNoise(ctx: AudioContext): AudioBuffer {
  if (pinkBuffer) return pinkBuffer
  const length = ctx.sampleRate * 0.5
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)

  // Voss-McCartney algorithm with 3 rows
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.96900 * b2 + white * 0.1538520
    b3 = 0.86650 * b3 + white * 0.3104856
    b4 = 0.55000 * b4 + white * 0.5329522
    b5 = -0.7616 * b5 - white * 0.0168980
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
    b6 = white * 0.115926
  }

  pinkBuffer = buffer
  return buffer
}

export function resetNoiseBuffers() {
  whiteBuffer = null
  pinkBuffer = null
}
