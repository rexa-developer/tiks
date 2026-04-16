import { describe, it, expect } from 'vitest'
import { resolveTheme, defineTheme, SOFT_THEME, CRISP_THEME } from '../themes'

describe('ThemeRegistry', () => {
  it('resolveTheme("soft") returns SOFT_THEME', () => {
    expect(resolveTheme('soft')).toBe(SOFT_THEME)
  })

  it('resolveTheme("crisp") returns CRISP_THEME', () => {
    expect(resolveTheme('crisp')).toBe(CRISP_THEME)
  })

  it('resolveTheme with unknown string throws', () => {
    // @ts-expect-error testing runtime behavior with invalid input
    expect(() => resolveTheme('nope')).toThrow('Unknown theme: "nope"')
  })

  it('resolveTheme with TiksTheme object returns it', () => {
    const custom = { ...SOFT_THEME, name: 'custom' }
    expect(resolveTheme(custom)).toBe(custom)
  })

  it('defineTheme merges partial overrides with soft defaults', () => {
    const theme = defineTheme({ name: 'brand', baseFreq: 500 })
    expect(theme.name).toBe('brand')
    expect(theme.baseFreq).toBe(500)
    expect(theme.oscType).toBe('sine') // from SOFT default
    expect(theme.filterFreq).toBe(3000) // from SOFT default
  })

  it('defineTheme preserves all provided values', () => {
    const theme = defineTheme({
      name: 'full',
      baseFreq: 330,
      noiseColor: 'pink',
      oscType: 'square',
      filterFreq: 2000,
      filterQ: 2.0,
      attack: 0.001,
      decay: 0.5,
      brightness: 100,
    })
    expect(theme.baseFreq).toBe(330)
    expect(theme.noiseColor).toBe('pink')
    expect(theme.oscType).toBe('square')
    expect(theme.filterFreq).toBe(2000)
    expect(theme.filterQ).toBe(2.0)
  })

  it('SOFT_THEME has expected values', () => {
    expect(SOFT_THEME.baseFreq).toBe(440)
    expect(SOFT_THEME.oscType).toBe('sine')
    expect(SOFT_THEME.decay).toBe(1.0)
  })

  it('CRISP_THEME has expected values', () => {
    expect(CRISP_THEME.baseFreq).toBe(660)
    expect(CRISP_THEME.oscType).toBe('triangle')
    expect(CRISP_THEME.decay).toBe(0.6)
  })
})
