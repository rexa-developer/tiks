export interface TiksTheme {
  name: string
  baseFreq: number
  noiseColor: 'white' | 'pink'
  oscType: OscillatorType
  filterFreq: number
  filterQ: number
  attack: number
  decay: number
  brightness: number
}

export interface TiksOptions {
  theme?: ThemeName | TiksTheme
  volume?: number
  muted?: boolean
  /** Auto-mute when the user prefers reduced motion. Default: `true`. */
  respectReducedMotion?: boolean
  /** Minimum ms between hover() sounds. Default: `80`. `0` disables throttling. */
  hoverThrottleMs?: number
}

export type SoundGenerator = (ctx: AudioContext, dest: AudioNode, theme: TiksTheme) => void

export type ThemeName = 'soft' | 'crisp' | 'arcade' | 'glass'
