import { describe, expect, it, vi } from 'vitest'
import { createTiks } from '../create'
import { audioEngine } from '../engine'
import { useTiks as solidTiks } from '../solid'
import { useTiks as svelteTiks } from '../svelte'

describe('createTiks factory', () => {
  it('returns all 13 methods', () => {
    const api = createTiks()
    const methods = [
      'click',
      'toggle',
      'success',
      'error',
      'warning',
      'hover',
      'pop',
      'swoosh',
      'notify',
      'mute',
      'unmute',
      'setVolume',
      'setTheme',
    ] as const
    for (const method of methods) {
      expect(typeof api[method], `${method} should be a function`).toBe('function')
    }
  })

  it('two instances have independent themes', () => {
    const playSpy = vi.spyOn(audioEngine, 'playSound')

    const A = createTiks({ theme: 'crisp' })
    const B = createTiks() // defaults to soft

    A.click()
    B.click()

    // playSound is called with (generator, theme) — theme is 2nd arg
    const callArgs = playSpy.mock.calls
    expect(callArgs.length).toBeGreaterThanOrEqual(2)

    // Find the A call and B call — last two calls in order
    const aCall = callArgs[callArgs.length - 2]
    const bCall = callArgs[callArgs.length - 1]

    expect(aCall[1].name).toBe('crisp')
    expect(bCall[1].name).toBe('soft')

    playSpy.mockRestore()
  })

  it('volume is shared/global: setVolume affects audioEngine', () => {
    const A = createTiks()
    A.setVolume(0.6)
    expect(audioEngine.getVolume()).toBe(0.6)
    // Reset
    audioEngine.setVolume(0.3)
  })

  it('methods do not throw before any gesture (no context)', () => {
    const api = createTiks()
    expect(() => api.click()).not.toThrow()
    expect(() => api.toggle(true)).not.toThrow()
    expect(() => api.toggle(false)).not.toThrow()
    expect(() => api.success()).not.toThrow()
    expect(() => api.error()).not.toThrow()
    expect(() => api.warning()).not.toThrow()
    expect(() => api.hover()).not.toThrow()
    expect(() => api.pop()).not.toThrow()
    expect(() => api.swoosh()).not.toThrow()
    expect(() => api.notify()).not.toThrow()
    expect(() => api.mute()).not.toThrow()
    expect(() => api.unmute()).not.toThrow()
    expect(() => api.setVolume(0.5)).not.toThrow()
    expect(() => api.setTheme('crisp')).not.toThrow()
  })

  it('svelte useTiks is the same function as createTiks', () => {
    expect(svelteTiks).toBe(createTiks)
  })

  it('solid useTiks is the same function as createTiks', () => {
    expect(solidTiks).toBe(createTiks)
  })
})
