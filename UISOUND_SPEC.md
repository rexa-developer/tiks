# tink — Procedural UI Sounds for the Web

> The web has been silent for 30 years. `tink` makes it sing.

**A ~3KB, zero-dependency library that generates UI sounds through pure synthesis. No audio files. No downloads. Just math.**

---

## Vision

Every native app has satisfying sounds — iOS toggle clicks, macOS trash crumple, Android keyboard taps. Web apps have nothing. `tink` brings that missing sensory layer to the web using the Web Audio API. Every sound is generated at runtime through oscillators, noise buffers, and gain envelopes — zero audio files shipped.

The key insight (borrowed from BrandTones research): individual sounds sourced from different libraries feel incoherent. `tink` generates all sounds from a shared synthesis engine with a common base frequency, envelope shape, and spectral character — so they sound like they belong together.

---

## API Design

### Basic Usage

```ts
import { tink } from 'tink'

// Initialize on first user gesture (required by browsers)
document.addEventListener('click', () => tink.init(), { once: true })

// Play sounds
tink.click()        // Short, crisp tap
tink.toggle(true)   // Toggle ON  — rising pitch
tink.toggle(false)  // Toggle OFF — falling pitch
tink.success()      // Cheerful confirmation
tink.error()        // Gentle error nudge
tink.warning()      // Cautious alert
tink.hover()        // Subtle hover whisper
tink.pop()          // Playful pop (add/remove items)
tink.swoosh()       // Quick transition whoosh
tink.notify()       // Attention-getting notification
```

### Configuration

```ts
import { tink } from 'tink'

tink.init({
  theme: 'soft',       // 'soft' | 'crisp' | 'retro' | 'minimal' | 'cosmic'
  volume: 0.4,         // 0.0 - 1.0 (default: 0.3)
  muted: false,        // Global mute
  respectReducedMotion: true, // Mute if prefers-reduced-motion is set
})

// Runtime controls
tink.setVolume(0.5)
tink.mute()
tink.unmute()
tink.setTheme('crisp')
```

### React Hook

```tsx
import { useTink } from 'tink/react'

function ToggleButton() {
  const { click, toggle } = useTink()

  return (
    <button onClick={() => {
      click()
      setEnabled(prev => {
        toggle(!prev)
        return !prev
      })
    }}>
      Toggle
    </button>
  )
}
```

### Vue Composable

```vue
<script setup>
import { useTink } from 'tink/vue'

const { click, success, error } = useTink()
</script>

<template>
  <button @click="click()">Tap me</button>
  <button @click="success()">Submit</button>
</template>
```

### Vanilla JS (CDN)

```html
<script type="module">
  import { tink } from 'https://esm.sh/tink'
  document.querySelector('#btn').onclick = () => tink.click()
</script>
```

---

## Sound Catalog

### Core Sounds (10)

| Sound | Character | Synthesis Method | Duration |
|-------|-----------|-----------------|----------|
| `click()` | Short, crisp tap | Noise burst → bandpass filter → fast decay | ~30ms |
| `toggle(on)` | Rising pitch snap | Sine osc, freq ramp up + noise transient | ~60ms |
| `toggle(off)` | Falling pitch snap | Sine osc, freq ramp down + noise transient | ~60ms |
| `success()` | Two-note rising chime | Two sine oscs, ascending interval (5th) | ~200ms |
| `error()` | Gentle buzz/thud | Triangle osc, low freq + noise, quick decay | ~150ms |
| `warning()` | Cautious double-tap | Two short sine bursts, same pitch | ~180ms |
| `hover()` | Whisper-soft tick | Tiny noise burst, very low volume, highpass | ~15ms |
| `pop()` | Playful bubble pop | Sine osc, sharp freq drop 800→200Hz | ~80ms |
| `swoosh()` | Quick whoosh | Filtered noise, freq sweep high→low | ~120ms |
| `notify()` | Bright attention ping | Sine osc at high freq + harmonic, longer tail | ~300ms |

### How Each Sound Works (Technical)

**click()** — The simplest and most important sound:
```
[White Noise Buffer] → [BandpassFilter 4000Hz Q:1] → [GainNode: 0.3→0 in 30ms] → output
```

**success()** — A rising two-note chime:
```
t=0ms:   [Sine 523Hz (C5)] → [Gain 0.3→0 in 100ms]
t=80ms:  [Sine 784Hz (G5)] → [Gain 0.3→0 in 150ms]
Both → output
```

**error()** — A low, gentle buzz:
```
[Triangle 150Hz] → [Gain: 0.2→0 in 120ms]
[Noise burst]    → [Lowpass 500Hz] → [Gain: 0.1→0 in 80ms]
Both → output
```

**pop()** — Frequency drop creates the "pop" sensation:
```
[Sine: freq ramps 800→200Hz in 80ms] → [Gain: 0.3→0 in 80ms] → output
```

---

## Theme System

Each theme defines a `TinkTheme` object that controls the shared DNA of all sounds:

```ts
interface TinkTheme {
  name: string
  baseFreq: number       // Root frequency all sounds derive from
  noiseColor: 'white' | 'pink'  // Type of noise used for transients
  oscType: OscillatorType       // 'sine' | 'triangle' | 'square' | 'sawtooth'
  filterFreq: number     // Bandpass center for click/transient sounds
  filterQ: number        // Filter resonance
  attack: number         // Global attack time multiplier
  decay: number          // Global decay time multiplier
  brightness: number     // Highpass filter cutoff (higher = brighter)
  reverbMix: number      // 0-1, amount of reverb tail (0 = dry)
}
```

### Built-in Themes

**soft** (default) — Warm, rounded, Apple-like
```ts
{
  name: 'soft',
  baseFreq: 440,
  noiseColor: 'white',
  oscType: 'sine',
  filterFreq: 3000,
  filterQ: 0.7,
  attack: 0.002,
  decay: 1.0,
  brightness: 200,
  reverbMix: 0.1,
}
```

**crisp** — Sharp, tactile, mechanical keyboard feel
```ts
{
  name: 'crisp',
  baseFreq: 660,
  noiseColor: 'white',
  oscType: 'triangle',
  filterFreq: 5000,
  filterQ: 1.2,
  attack: 0.001,
  decay: 0.6,
  brightness: 800,
  reverbMix: 0.0,
}
```

**retro** — 8-bit, chiptune, nostalgic
```ts
{
  name: 'retro',
  baseFreq: 330,
  noiseColor: 'white',
  oscType: 'square',
  filterFreq: 2000,
  filterQ: 2.0,
  attack: 0.001,
  decay: 0.5,
  brightness: 100,
  reverbMix: 0.0,
}
```

**minimal** — Barely there, ultra-subtle
```ts
{
  name: 'minimal',
  baseFreq: 520,
  noiseColor: 'pink',
  oscType: 'sine',
  filterFreq: 2500,
  filterQ: 0.5,
  attack: 0.003,
  decay: 0.4,
  brightness: 400,
  reverbMix: 0.05,
}
```

**cosmic** — Spacey, reverberant, sci-fi
```ts
{
  name: 'cosmic',
  baseFreq: 280,
  noiseColor: 'pink',
  oscType: 'sine',
  filterFreq: 1800,
  filterQ: 1.5,
  attack: 0.005,
  decay: 1.8,
  brightness: 150,
  reverbMix: 0.3,
}
```

### Custom Themes

```ts
import { tink, defineTheme } from 'tink'

const myTheme = defineTheme({
  name: 'brand',
  baseFreq: 500,
  oscType: 'triangle',
  // ... override any defaults
})

tink.init({ theme: myTheme })
```

---

## Technical Architecture

### Audio Graph (per sound)

```
OscillatorNode ──┐
                 ├──→ GainNode (envelope) ──→ MasterGain ──→ destination
NoiseBuffer ─────┘         ↑
    ↓                      │
FilterNode ────────────────┘
```

### Core Engine (~50 lines)

```ts
class TinkEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private theme: TinkTheme
  private muted: boolean = false

  init(options?: TinkOptions) {
    this.ctx = new AudioContext()
    this.masterGain = this.ctx.createGain()
    this.masterGain.connect(this.ctx.destination)
    this.masterGain.gain.value = options?.volume ?? 0.3
    this.theme = resolveTheme(options?.theme ?? 'soft')

    if (options?.respectReducedMotion) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      if (mq.matches) this.muted = true
    }
  }

  private playSound(generator: SoundGenerator) {
    if (this.muted || !this.ctx || !this.masterGain) return
    // Resume context if suspended (autoplay policy)
    if (this.ctx.state === 'suspended') this.ctx.resume()
    generator(this.ctx, this.masterGain, this.theme)
  }

  click()         { this.playSound(generators.click) }
  toggle(on: boolean) { this.playSound(on ? generators.toggleOn : generators.toggleOff) }
  success()       { this.playSound(generators.success) }
  error()         { this.playSound(generators.error) }
  warning()       { this.playSound(generators.warning) }
  hover()         { this.playSound(generators.hover) }
  pop()           { this.playSound(generators.pop) }
  swoosh()        { this.playSound(generators.swoosh) }
  notify()        { this.playSound(generators.notify) }

  mute()          { this.muted = true }
  unmute()        { this.muted = false }
  setVolume(v: number) { if (this.masterGain) this.masterGain.gain.value = v }
  setTheme(t: string | TinkTheme) { this.theme = resolveTheme(t) }
}

export const tink = new TinkEngine()
```

### Sound Generator Pattern

Each sound is a pure function:

```ts
type SoundGenerator = (
  ctx: AudioContext,
  dest: AudioNode,
  theme: TinkTheme
) => void

// Example: click generator
const click: SoundGenerator = (ctx, dest, theme) => {
  const now = ctx.currentTime
  const duration = 0.03 * theme.decay

  // Create noise burst
  const bufferSize = ctx.sampleRate * duration
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1)
  }

  const noise = ctx.createBufferSource()
  noise.buffer = buffer

  // Bandpass filter
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = theme.filterFreq
  filter.Q.value = theme.filterQ

  // Envelope
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.3, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

  // Connect: noise → filter → gain → master
  noise.connect(filter)
  filter.connect(gain)
  gain.connect(dest)

  noise.start(now)
  noise.stop(now + duration)
}
```

### Noise Buffer Cache

White noise and pink noise buffers are generated once and reused:

```ts
// Generated once on init, reused by all sounds
const noiseBuffers = {
  white: createWhiteNoise(ctx, 0.5),  // 0.5 second buffer
  pink: createPinkNoise(ctx, 0.5),
}
```

---

## Project Structure

```
tink/
├── src/
│   ├── index.ts           # Main export, TinkEngine class
│   ├── types.ts           # TypeScript interfaces
│   ├── themes/
│   │   ├── index.ts       # Theme registry + resolveTheme()
│   │   ├── soft.ts
│   │   ├── crisp.ts
│   │   ├── retro.ts
│   │   ├── minimal.ts
│   │   └── cosmic.ts
│   ├── generators/
│   │   ├── index.ts       # All generators exported
│   │   ├── click.ts
│   │   ├── toggle.ts
│   │   ├── success.ts
│   │   ├── error.ts
│   │   ├── warning.ts
│   │   ├── hover.ts
│   │   ├── pop.ts
│   │   ├── swoosh.ts
│   │   └── notify.ts
│   ├── utils/
│   │   ├── noise.ts       # White/pink noise buffer generation
│   │   ├── envelope.ts    # Gain envelope helpers
│   │   └── context.ts     # AudioContext management
│   ├── react.ts           # useTink() hook
│   └── vue.ts             # useTink() composable
├── demo/                  # Interactive demo site
│   └── index.html         # Single-file demo (THE marketing page)
├── package.json
├── tsconfig.json
├── tsup.config.ts         # Bundle with tsup (tiny bundles)
├── LICENSE                # MIT
└── README.md
```

### Build Output

```
dist/
├── index.mjs       # ESM (~3KB minified+gzipped)
├── index.cjs       # CJS
├── index.d.ts      # Types
├── react.mjs       # React hook (~0.5KB additional)
├── react.d.ts
├── vue.mjs         # Vue composable (~0.5KB additional)
└── vue.d.ts
```

### Build Tool

Use `tsup` (built on esbuild) for blazing fast builds:

```ts
// tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    react: 'src/react.ts',
    vue: 'src/vue.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  minify: true,
  treeshake: true,
  external: ['react', 'vue'],
})
```

### Package.json Exports

```json
{
  "name": "tink",
  "version": "0.1.0",
  "description": "Procedural UI sounds for the web. Zero audio files. Pure synthesis.",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./react": {
      "import": "./dist/react.mjs",
      "types": "./dist/react.d.ts"
    },
    "./vue": {
      "import": "./dist/vue.mjs",
      "types": "./dist/vue.d.ts"
    }
  },
  "keywords": [
    "ui-sounds", "web-audio", "procedural-audio",
    "sound-effects", "interaction-design", "haptic",
    "accessibility", "ux", "react", "vue"
  ],
  "license": "MIT",
  "sideEffects": false,
  "files": ["dist"]
}
```

---

## Accessibility & UX Considerations

### Respect User Preferences
- **`prefers-reduced-motion`**: When enabled, `tink` mutes itself by default. Sounds can be considered "motion" in the broader accessibility sense.
- **Global mute**: Always provide users a way to disable sounds. The library makes this trivial with `tink.mute()`.
- **Volume control**: Default volume is 0.3 (30%) — subtle, not intrusive.

### Browser Autoplay Policy
- AudioContext cannot start without a user gesture.
- `tink.init()` should be called inside a click/tap handler.
- If called before a gesture, the context is created in "suspended" state and auto-resumes on the next user interaction.
- Each `playSound()` call checks `ctx.state` and calls `ctx.resume()` if needed.

### No Sound is Mandatory
- Sounds are additive feedback — never the only way to convey information.
- Every action that plays a sound should also have visual feedback.
- Screen readers are unaffected (Web Audio does not interfere with aria).

---

## Demo Page Strategy (THE Marketing)

The demo page IS the product marketing. A single beautiful HTML page with:

### Sections
1. **Hero**: "The web has been silent for 30 years." + one big button that plays a satisfying `click()`
2. **Interactive playground**: Toggle switches, buttons, form submissions — each wired to tink sounds. Visitors can feel the difference immediately.
3. **Theme switcher**: Switch between soft/crisp/retro/minimal/cosmic and hear ALL sounds change character instantly.
4. **Code snippet**: Show the 3-line setup.
5. **Size badge**: "~3KB. Zero audio files. Pure math."
6. **npm install**: `npm install tink`

### Why the Demo Matters
Pretext went viral because of its visual demos. `tink` goes viral because of its auditory demos. The moment someone clicks a button and hears a satisfying procedural sound — with ZERO loading — they understand the value instantly. The demo IS the pitch.

---

## Launch Strategy

### Phase 1: Build + Ship (1-2 weeks)
- Core engine + 10 sounds + 5 themes
- React hook + Vue composable
- Demo page
- README with GIFs (showing interactions) and audio waveform visualizations
- Publish to npm

### Phase 2: Announce (Day 1)
- Post on Hacker News: "Show HN: tink — Procedural UI sounds in 3KB, zero audio files"
- Post on r/javascript, r/webdev, r/reactjs
- Tweet with demo video (screen recording with audio)
- The demo page URL in every post

### Phase 3: Community (Week 2+)
- Encourage community themes (share your theme!)
- Add more sounds based on feedback
- Framework adapters (Svelte, Solid, Angular)
- `tink/haptics` — combine with vibration API on mobile

---

## Competitive Positioning

```
┌─────────────────────┬─────────┬───────────┬──────────┬───────────┐
│                     │  tink   │  soundcn  │ use-sound│  Tone.js  │
├─────────────────────┼─────────┼───────────┼──────────┼───────────┤
│ Size                │  ~3KB   │ 10-100KB  │  ~8KB    │  ~200KB   │
│                     │         │ per sound │ + files  │           │
├─────────────────────┼─────────┼───────────┼──────────┼───────────┤
│ Audio files needed  │  None   │  Base64   │  MP3s    │  Optional │
├─────────────────────┼─────────┼───────────┼──────────┼───────────┤
│ Procedural          │  Yes    │  No       │  No      │  Yes      │
├─────────────────────┼─────────┼───────────┼──────────┼───────────┤
│ Coherent themes     │  Yes    │  No       │  No      │  Manual   │
├─────────────────────┼─────────┼───────────┼──────────┼───────────┤
│ Framework agnostic  │  Yes    │  React    │  React   │  Yes      │
├─────────────────────┼─────────┼───────────┼──────────┼───────────┤
│ Purpose-built UI    │  Yes    │  Yes      │  Generic │  Generic  │
├─────────────────────┼─────────┼───────────┼──────────┼───────────┤
│ Zero config         │  Yes    │  No       │  No      │  No       │
└─────────────────────┴─────────┴───────────┴──────────┴───────────┘
```

---

## One-liner Pitch

**"What Pretext did for text measurement, tink does for UI feedback — pure math, zero dependencies, instant results."**
