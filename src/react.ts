import { useEffect, useRef, useMemo } from 'react'
import { TiksEngine } from './tiks'
import type { TiksOptions, TiksTheme, ThemeName } from './types'

export function useTiks(options?: TiksOptions) {
  const engineRef = useRef<TiksEngine | null>(null)

  if (!engineRef.current) {
    engineRef.current = new TiksEngine()
  }

  const theme = options?.theme
  const volume = options?.volume
  const muted = options?.muted
  const respectReducedMotion = options?.respectReducedMotion

  useEffect(() => {
    engineRef.current!.init(options)
  }, [theme, volume, muted, respectReducedMotion])

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
