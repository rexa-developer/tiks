import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTiks } from '../react'

describe('useTiks', () => {
  it('returns all sound methods', () => {
    const { result } = renderHook(() => useTiks())

    expect(typeof result.current.click).toBe('function')
    expect(typeof result.current.toggle).toBe('function')
    expect(typeof result.current.success).toBe('function')
    expect(typeof result.current.error).toBe('function')
    expect(typeof result.current.warning).toBe('function')
    expect(typeof result.current.hover).toBe('function')
    expect(typeof result.current.pop).toBe('function')
    expect(typeof result.current.swoosh).toBe('function')
    expect(typeof result.current.notify).toBe('function')
  })

  it('returns control methods', () => {
    const { result } = renderHook(() => useTiks())

    expect(typeof result.current.mute).toBe('function')
    expect(typeof result.current.unmute).toBe('function')
    expect(typeof result.current.setVolume).toBe('function')
    expect(typeof result.current.setTheme).toBe('function')
  })

  it('returns stable references across re-renders', () => {
    const { result, rerender } = renderHook(() => useTiks())

    const firstClick = result.current.click
    rerender()
    expect(result.current.click).toBe(firstClick)
  })

  it('sound methods do not throw', () => {
    const { result } = renderHook(() => useTiks())

    expect(() => result.current.click()).not.toThrow()
    expect(() => result.current.toggle(true)).not.toThrow()
    expect(() => result.current.success()).not.toThrow()
  })
})
