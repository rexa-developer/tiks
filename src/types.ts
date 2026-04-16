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
  respectReducedMotion?: boolean
}

export type SoundGenerator = (
  ctx: AudioContext,
  dest: AudioNode,
  theme: TiksTheme,
) => void

export type ThemeName = 'soft' | 'crisp'
