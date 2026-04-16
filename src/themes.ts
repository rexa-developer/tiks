import type { TiksTheme, ThemeName } from './types'

export const SOFT_THEME: TiksTheme = {
  name: 'soft',
  baseFreq: 440,
  noiseColor: 'pink',
  oscType: 'sine',
  filterFreq: 3000,
  filterQ: 0.7,
  attack: 0.002,
  decay: 1.0,
  brightness: 2000,
}

export const CRISP_THEME: TiksTheme = {
  name: 'crisp',
  baseFreq: 523,
  noiseColor: 'white',
  oscType: 'triangle',
  filterFreq: 5000,
  filterQ: 1.2,
  attack: 0.0015,
  decay: 0.6,
  brightness: 4000,
}

const themes: Record<ThemeName, TiksTheme> = {
  soft: SOFT_THEME,
  crisp: CRISP_THEME,
}

export function resolveTheme(theme: ThemeName | TiksTheme): TiksTheme {
  if (typeof theme === 'string') {
    const found = themes[theme as ThemeName]
    if (!found) throw new Error(`Unknown theme: "${theme}"`)
    return found
  }
  return theme
}

export function defineTheme(
  overrides: Partial<TiksTheme> & { name: string },
): TiksTheme {
  return { ...SOFT_THEME, ...overrides }
}
