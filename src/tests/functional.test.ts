import { describe, it, expect } from 'vitest'
import {
  tiks, init, click, toggle, success, error, warning,
  hover, pop, swoosh, notify, mute, unmute, setVolume, setTheme,
  defineTheme, SOFT_THEME, CRISP_THEME,
} from '../index'
import { audioEngine } from '../engine'

describe('Functional API', () => {
  it('exports all sound functions', () => {
    expect(typeof click).toBe('function')
    expect(typeof toggle).toBe('function')
    expect(typeof success).toBe('function')
    expect(typeof error).toBe('function')
    expect(typeof warning).toBe('function')
    expect(typeof hover).toBe('function')
    expect(typeof pop).toBe('function')
    expect(typeof swoosh).toBe('function')
    expect(typeof notify).toBe('function')
  })

  it('exports control functions', () => {
    expect(typeof init).toBe('function')
    expect(typeof mute).toBe('function')
    expect(typeof unmute).toBe('function')
    expect(typeof setVolume).toBe('function')
    expect(typeof setTheme).toBe('function')
  })

  it('exports theme utilities', () => {
    expect(typeof defineTheme).toBe('function')
    expect(SOFT_THEME.name).toBe('soft')
    expect(CRISP_THEME.name).toBe('crisp')
  })

  it('functional mute/unmute affects shared state', () => {
    init()
    mute()
    expect(audioEngine.isMuted()).toBe(true)
    unmute()
    expect(audioEngine.isMuted()).toBe(false)
  })

  it('functional setVolume works', () => {
    init()
    setVolume(0.6)
    expect(audioEngine.getVolume()).toBe(0.6)
    setVolume(0.3)
  })

  it('functional sound calls do not throw', () => {
    init()
    expect(() => click()).not.toThrow()
    expect(() => toggle(true)).not.toThrow()
    expect(() => toggle(false)).not.toThrow()
    expect(() => success()).not.toThrow()
    expect(() => error()).not.toThrow()
    expect(() => warning()).not.toThrow()
    expect(() => hover()).not.toThrow()
    expect(() => pop()).not.toThrow()
    expect(() => swoosh()).not.toThrow()
    expect(() => notify()).not.toThrow()
  })

  it('exports tiks singleton', () => {
    expect(tiks).toBeTruthy()
    expect(typeof tiks.click).toBe('function')
  })
})
