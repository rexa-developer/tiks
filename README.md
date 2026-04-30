# tiks

**Procedural UI sounds for the web. Zero audio files. Pure synthesis.**

[![npm](https://img.shields.io/npm/v/@rexa-developer/tiks)](https://www.npmjs.com/package/@rexa-developer/tiks)
[![gzip size](https://img.shields.io/badge/gzip-~2KB-brightgreen)](https://bundlephobia.com/package/@rexa-developer/tiks)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

Every native app has satisfying sounds — iOS toggle clicks, macOS trash crumple, Android keyboard taps. Web apps have nothing. **tiks** brings that missing sensory layer using the Web Audio API. Every sound is generated at runtime through oscillators, noise buffers, and gain envelopes. No audio files shipped. Just math.

All sounds share a common synthesis engine with a unified theme — so they sound like they belong together.

## Install

```bash
npm install @rexa-developer/tiks
```

## Quick Start

```ts
import { tiks } from '@rexa-developer/tiks'

// Initialize (safe to call at any time — the AudioContext is created on the
// first real user gesture, so this never triggers an autoplay-policy warning)
tiks.init()

// Play sounds
tiks.click()
tiks.success()
tiks.toggle(true)
```

That's it. Three lines.

## Sounds

| Method | Character | Duration |
|--------|-----------|----------|
| `click()` | Short, crisp tap | ~30ms |
| `toggle(true)` | Rising pitch snap | ~60ms |
| `toggle(false)` | Falling pitch snap | ~60ms |
| `success()` | Two-note rising chime | ~200ms |
| `error()` | Gentle buzz/thud | ~150ms |
| `warning()` | Cautious double-tap | ~180ms |
| `hover()` | Whisper-soft tick | ~15ms |
| `pop()` | Playful bubble pop | ~80ms |
| `swoosh()` | Quick transition whoosh | ~120ms |
| `notify()` | Bright attention ping | ~300ms |

## Themes

Two built-in themes that change the character of every sound:

```ts
tiks.init({ theme: 'soft' })   // Warm, rounded, Apple-like (default)
tiks.init({ theme: 'crisp' })  // Sharp, tactile, mechanical keyboard feel
```

Switch at runtime:

```ts
tiks.setTheme('crisp')
```

### Custom Themes

```ts
import { tiks, defineTheme } from '@rexa-developer/tiks'

const brand = defineTheme({
  name: 'brand',
  baseFreq: 500,
  oscType: 'triangle',
  decay: 0.8,
})

tiks.init({ theme: brand })
```

Theme properties:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Theme identifier |
| `baseFreq` | `number` | Root frequency all sounds derive from |
| `noiseColor` | `'white' \| 'pink'` | Noise type for transients |
| `oscType` | `OscillatorType` | `'sine'` `'triangle'` `'square'` `'sawtooth'` |
| `filterFreq` | `number` | Bandpass center for click/transient sounds |
| `filterQ` | `number` | Filter resonance |
| `attack` | `number` | Attack time in seconds |
| `decay` | `number` | Decay multiplier (1.0 = normal, 0.5 = snappy) |
| `brightness` | `number` | Highpass cutoff (higher = brighter) |

## Controls

```ts
tiks.setVolume(0.5)   // 0.0 - 1.0 (default: 0.3)
tiks.mute()
tiks.unmute()
tiks.setTheme('crisp')
```

## Options

```ts
tiks.init({
  theme: 'soft',              // 'soft' | 'crisp' | custom theme
  volume: 0.4,                // 0.0 - 1.0
  muted: false,               // Start muted
  respectReducedMotion: true,  // Auto-mute if prefers-reduced-motion
})
```

## React

```tsx
import { useTiks } from '@rexa-developer/tiks/react'

function ToggleButton() {
  const { click, toggle } = useTiks()

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

The hook auto-initializes on mount. All returned methods are stable references.

> **Note:** `volume` and `muted` are shared globally across all `useTiks` hooks (they live on the underlying audio engine). `theme` is per-hook. If two hooks pass different `volume` values, the last-mounted one wins.

## Vue

```vue
<script setup lang="ts">
import { useTiks } from '@rexa-developer/tiks/vue'

const { click, success, error } = useTiks()
</script>

<template>
  <button @click="click">Click me</button>
</template>
```

The composable auto-initializes on component mount. Same global/per-instance semantics as the React hook: `volume` and `muted` are shared across all `useTiks` calls, `theme` is per-composable.

## Tree-Shakeable Imports

For minimal bundles, import only the sounds you need:

```ts
import { init, click, success } from '@rexa-developer/tiks'

init()
click()
success()
```

## CDN

```html
<script type="module">
  import { tiks } from 'https://esm.sh/@rexa-developer/tiks'
  document.querySelector('#btn').onclick = () => tiks.click()
</script>
```

## Accessibility

- **`prefers-reduced-motion`**: Pass `respectReducedMotion: true` to auto-mute
- **Sounds are additive**: Never the only way to convey information — always pair with visual feedback
- **Global mute**: `tiks.mute()` for user control
- **Default volume is 30%**: Subtle, not intrusive

## Browser Support

Works in all browsers that support the [Web Audio API](https://caniuse.com/audio-api) — Chrome, Firefox, Safari, Edge, and mobile browsers. The library handles autoplay policy automatically by resuming the AudioContext on first interaction.

## How It Works

Each sound is a pure function that creates Web Audio nodes, connects them, schedules playback, and lets the browser garbage-collect them:

```
OscillatorNode ──┐
                 ├──→ GainNode (envelope) ──→ MasterGain ──→ speakers
NoiseBuffer ─────┘
    ↓
FilterNode ───────────────────────────────┘
```

No audio files. No downloads. No decoding. Just oscillators and math.

## Size

| Entry | Gzipped |
|-------|---------|
| Core (`tiks`) | ~2KB |
| React hook (`tiks/react`) | ~300B |
| Vue composable (`tiks/vue`) | ~300B |

## License

MIT
