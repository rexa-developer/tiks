import { shallowRef, watchEffect } from 'vue'
import { TiksEngine } from './tiks'
import type { TiksOptions, TiksTheme, ThemeName } from './types'

export function useTiks(options?: TiksOptions) {
  const engine = shallowRef<TiksEngine | null>(null)

  if (!engine.value) {
    engine.value = new TiksEngine()
  }

  watchEffect(() => {
    engine.value!.init(options)
  })

  return {
    click: () => engine.value!.click(),
    toggle: (on: boolean) => engine.value!.toggle(on),
    success: () => engine.value!.success(),
    error: () => engine.value!.error(),
    warning: () => engine.value!.warning(),
    hover: () => engine.value!.hover(),
    pop: () => engine.value!.pop(),
    swoosh: () => engine.value!.swoosh(),
    notify: () => engine.value!.notify(),
    mute: () => engine.value!.mute(),
    unmute: () => engine.value!.unmute(),
    setVolume: (v: number) => engine.value!.setVolume(v),
    setTheme: (t: ThemeName | TiksTheme) => engine.value!.setTheme(t),
  }
}
