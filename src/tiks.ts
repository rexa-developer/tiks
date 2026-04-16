import type { TiksOptions, TiksTheme, ThemeName } from './types'
import { audioEngine } from './engine'
import { resolveTheme, SOFT_THEME } from './themes'
import * as generators from './generators'

export class TiksEngine {
  private theme: TiksTheme = SOFT_THEME

  init(options?: TiksOptions) {
    audioEngine.init(options)
    if (options?.theme) {
      this.theme = resolveTheme(options.theme)
    }
  }

  click() {
    audioEngine.playSound(generators.click, this.theme)
  }

  toggle(on: boolean) {
    audioEngine.playSound(on ? generators.toggleOn : generators.toggleOff, this.theme)
  }

  success() {
    audioEngine.playSound(generators.success, this.theme)
  }

  error() {
    audioEngine.playSound(generators.error, this.theme)
  }

  warning() {
    audioEngine.playSound(generators.warning, this.theme)
  }

  hover() {
    audioEngine.playSound(generators.hover, this.theme)
  }

  pop() {
    audioEngine.playSound(generators.pop, this.theme)
  }

  swoosh() {
    audioEngine.playSound(generators.swoosh, this.theme)
  }

  notify() {
    audioEngine.playSound(generators.notify, this.theme)
  }

  mute() {
    audioEngine.mute()
  }

  unmute() {
    audioEngine.unmute()
  }

  setVolume(v: number) {
    audioEngine.setVolume(v)
  }

  setTheme(t: ThemeName | TiksTheme) {
    this.theme = resolveTheme(t)
  }
}

export const tiks = new TiksEngine()
