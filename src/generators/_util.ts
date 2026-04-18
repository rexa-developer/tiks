import { getWhiteNoise, getPinkNoise } from '../noise'
import type { TiksTheme } from '../types'

// Small offset so scheduled events are always in the future relative to the
// audio thread. Safari drops events scheduled exactly at ctx.currentTime.
export const SCHEDULE_OFFSET = 0.005

export function startTime(ctx: AudioContext): number {
  return ctx.currentTime + SCHEDULE_OFFSET
}

export function createNoiseSource(ctx: AudioContext, theme: TiksTheme): AudioBufferSourceNode {
  const source = ctx.createBufferSource()
  source.buffer = theme.noiseColor === 'pink' ? getPinkNoise(ctx) : getWhiteNoise(ctx)
  source.loop = true
  return source
}
