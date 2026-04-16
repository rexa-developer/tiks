import { describe, it, expect, vi } from 'vitest'
import { tiks } from '../tiks'
import { audioEngine } from '../engine'

describe('TiksEngine', () => {
  it('init creates audio context', () => {
    tiks.init()
    expect(audioEngine.getContext()).toBeTruthy()
  })

  it('mute/unmute delegates to audioEngine', () => {
    tiks.init()
    tiks.mute()
    expect(audioEngine.isMuted()).toBe(true)
    tiks.unmute()
    expect(audioEngine.isMuted()).toBe(false)
  })

  it('setTheme changes to crisp', () => {
    tiks.setTheme('crisp')
    // Verify it doesn't throw
    expect(() => tiks.click()).not.toThrow()
  })

  it('setTheme throws on unknown theme', () => {
    // @ts-expect-error testing runtime behavior with invalid input
    expect(() => tiks.setTheme('unknown')).toThrow('Unknown theme')
  })

  it('setVolume delegates to audioEngine', () => {
    tiks.init()
    tiks.setVolume(0.5)
    expect(audioEngine.getVolume()).toBe(0.5)
    tiks.setVolume(0.3)
  })

  it('sound methods do not throw before init', () => {
    // These should gracefully no-op or work via ensureContext
    expect(() => tiks.click()).not.toThrow()
    expect(() => tiks.toggle(true)).not.toThrow()
    expect(() => tiks.toggle(false)).not.toThrow()
    expect(() => tiks.success()).not.toThrow()
    expect(() => tiks.error()).not.toThrow()
    expect(() => tiks.warning()).not.toThrow()
    expect(() => tiks.hover()).not.toThrow()
    expect(() => tiks.pop()).not.toThrow()
    expect(() => tiks.swoosh()).not.toThrow()
    expect(() => tiks.notify()).not.toThrow()
  })

  it('init with theme option sets theme', () => {
    tiks.init({ theme: 'crisp' })
    // Should not throw
    expect(() => tiks.click()).not.toThrow()
    // Reset
    tiks.setTheme('soft')
  })
})
