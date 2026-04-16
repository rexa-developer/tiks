import type { TiksOptions, TiksTheme, ThemeName } from './types'
import { tiks, TiksEngine } from './tiks'

// Class API
export { tiks, TiksEngine }

// Types
export type { TiksTheme, TiksOptions, SoundGenerator, ThemeName } from './types'

// Theme utilities
export { defineTheme, resolveTheme, SOFT_THEME, CRISP_THEME } from './themes'

// Tree-shakeable functional API
export function init(options?: TiksOptions) { tiks.init(options) }
export function click() { tiks.click() }
export function toggle(on: boolean) { tiks.toggle(on) }
export function success() { tiks.success() }
export function error() { tiks.error() }
export function warning() { tiks.warning() }
export function hover() { tiks.hover() }
export function pop() { tiks.pop() }
export function swoosh() { tiks.swoosh() }
export function notify() { tiks.notify() }
export function mute() { tiks.mute() }
export function unmute() { tiks.unmute() }
export function setVolume(v: number) { tiks.setVolume(v) }
export function setTheme(t: ThemeName | TiksTheme) { tiks.setTheme(t) }
