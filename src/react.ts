import { useEffect, useMemo, useRef } from 'react'
import { TiksEngine } from './tiks'
import type { ThemeName, TiksOptions, TiksTheme } from './types'

export function useTiks(options?: TiksOptions) {
  const engineRef = useRef<TiksEngine | null>(null)

  if (!engineRef.current) {
    engineRef.current = new TiksEngine()
  }

  const theme = options?.theme
  // A custom-theme object gets a new identity every render; key off its name
  // so init() doesn't re-run on every render.
  const themeKey = typeof theme === 'string' ? theme : theme?.name
  const volume = options?.volume
  const muted = options?.muted
  const respectReducedMotion = options?.respectReducedMotion

  useEffect(() => {
    engineRef.current!.init(options)
  }, [themeKey, volume, muted, respectReducedMotion])

  return useMemo(() => {
    const engine = engineRef.current!
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
  }, [])
}
