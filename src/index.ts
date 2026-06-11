import { TiksEngine, tiks } from './tiks'
import type { ThemeName, TiksOptions, TiksTheme } from './types'

// Theme utilities
export { ARCADE_THEME, CRISP_THEME, defineTheme, GLASS_THEME, resolveTheme, SOFT_THEME } from './themes'

// Types
export type { SoundGenerator, ThemeName, TiksOptions, TiksTheme } from './types'
// Class API
export { TiksEngine, tiks }

// Tree-shakeable functional API
export function init(options?: TiksOptions) {
  tiks.init(options)
}
export function click() {
  tiks.click()
}
export function toggle(on: boolean) {
  tiks.toggle(on)
}
export function success() {
  tiks.success()
}
export function error() {
  tiks.error()
}
export function warning() {
  tiks.warning()
}
export function hover() {
  tiks.hover()
}
export function pop() {
  tiks.pop()
}
export function swoosh() {
  tiks.swoosh()
}
export function notify() {
  tiks.notify()
}
export function mute() {
  tiks.mute()
}
export function unmute() {
  tiks.unmute()
}
export function setVolume(v: number) {
  tiks.setVolume(v)
}
export function setTheme(t: ThemeName | TiksTheme) {
  tiks.setTheme(t)
}

// Declarative auto-binding
export { bindTiks } from './bind'
export type { TiksApi } from './create'
// Multi-instance factory
export { createTiks } from './create'
