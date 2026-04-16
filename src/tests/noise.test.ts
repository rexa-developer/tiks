import { describe, it, expect, beforeEach } from 'vitest'
import { getWhiteNoise, getPinkNoise, resetNoiseBuffers } from '../noise'

describe('NoiseBuffers', () => {
  let ctx: AudioContext

  beforeEach(() => {
    resetNoiseBuffers()
    ctx = new AudioContext()
  })

  it('white noise buffer has correct length', () => {
    const buffer = getWhiteNoise(ctx)
    expect(buffer.length).toBe(Math.floor(ctx.sampleRate * 0.5))
  })

  it('white noise values are in [-1, 1] range', () => {
    const buffer = getWhiteNoise(ctx)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      expect(data[i]).toBeGreaterThanOrEqual(-1)
      expect(data[i]).toBeLessThanOrEqual(1)
    }
  })

  it('white noise caching returns same instance', () => {
    const a = getWhiteNoise(ctx)
    const b = getWhiteNoise(ctx)
    expect(a).toBe(b)
  })

  it('pink noise buffer has correct length', () => {
    const buffer = getPinkNoise(ctx)
    expect(buffer.length).toBe(Math.floor(ctx.sampleRate * 0.5))
  })

  it('pink noise caching returns same instance', () => {
    const a = getPinkNoise(ctx)
    const b = getPinkNoise(ctx)
    expect(a).toBe(b)
  })

  it('resetNoiseBuffers clears cache', () => {
    const a = getWhiteNoise(ctx)
    resetNoiseBuffers()
    const b = getWhiteNoise(ctx)
    expect(a).not.toBe(b)
  })
})
