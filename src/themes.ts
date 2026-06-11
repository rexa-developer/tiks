import type { TiksTheme, ThemeName } from './types'

export const SOFT_THEME: TiksTheme = {
  name: 'soft',
  baseFreq: 440,
  noiseColor: 'pink',
  oscType: 'sine',
  filterFreq: 3000,
  filterQ: 2.0,
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
  filterQ: 3.0,
  attack: 0.0015,
  decay: 0.6,
  brightness: 4000,
}

export const ARCADE_THEME: TiksTheme = {
  name: 'arcade',
  baseFreq: 392,        // G4 — lower root, chunky
  noiseColor: 'white',
  oscType: 'square',    // chiptune character
  filterFreq: 2200,
  filterQ: 5.0,
  attack: 0.001,
  decay: 0.5,           // short and punchy
  brightness: 2800,
}

export const GLASS_THEME: TiksTheme = {
  name: 'glass',
  baseFreq: 660,        // E5 — high, airy
  noiseColor: 'pink',
  oscType: 'sine',
  filterFreq: 6500,
  filterQ: 6.0,         // resonant, "ping"
  attack: 0.004,        // softer onset
  decay: 1.4,           // longer ring
  brightness: 5500,
}

const themes: Record<ThemeName, TiksTheme> = {
  soft: SOFT_THEME,
  crisp: CRISP_THEME,
  arcade: ARCADE_THEME,
  glass: GLASS_THEME,
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
