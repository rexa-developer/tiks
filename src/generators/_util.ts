import { getWhiteNoise, getPinkNoise } from '../noise'
import type { TiksTheme } from '../types'

export function createNoiseSource(ctx: AudioContext, theme: TiksTheme): AudioBufferSourceNode {
  const source = ctx.createBufferSource()
  source.buffer = theme.noiseColor === 'pink' ? getPinkNoise(ctx) : getWhiteNoise(ctx)
  source.loop = true
  return source
}
