import { TiksEngine } from './tiks'
import type { TiksOptions, TiksTheme, ThemeName } from './types'

export interface TiksApi {
  click: () => void
  toggle: (on: boolean) => void
  success: () => void
  error: () => void
  warning: () => void
  hover: () => void
  pop: () => void
  swoosh: () => void
  notify: () => void
  mute: () => void
  unmute: () => void
  setVolume: (v: number) => void
  setTheme: (t: ThemeName | TiksTheme) => void
}

export function createTiks(options?: TiksOptions): TiksApi {
  const engine = new TiksEngine()
  engine.init(options)
  return {
    click: () => engine.click(),
    toggle: (on: boolean) => engine.toggle(on),
    success: () => engine.success(),
    error: () => engine.error(),
    warning: () => engine.warning(),
    hover: () => engine.hover(),
    pop: () => engine.pop(),
    swoosh: () => engine.swoosh(),
    notify: () => engine.notify(),
    mute: () => engine.mute(),
    unmute: () => engine.unmute(),
    setVolume: (v: number) => engine.setVolume(v),
    setTheme: (t: ThemeName | TiksTheme) => engine.setTheme(t),
  }
}
