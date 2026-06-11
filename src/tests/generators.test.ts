import { describe, it, expect, vi } from 'vitest'
import { click } from '../generators/click'
import { toggleOn, toggleOff } from '../generators/toggle'
import { success } from '../generators/success'
import { error } from '../generators/error'
import { warning } from '../generators/warning'
import { hover } from '../generators/hover'
import { pop } from '../generators/pop'
import { swoosh } from '../generators/swoosh'
import { notify } from '../generators/notify'
import { SOFT_THEME, CRISP_THEME } from '../themes'
import type { TiksTheme } from '../types'

function createMockContext() {
  return new AudioContext()
}

function createMockDest() {
  const ctx = createMockContext()
  return ctx.createGain()
}

describe('Sound Generators', () => {
  const generators = [
    { name: 'click', fn: click },
    { name: 'toggleOn', fn: toggleOn },
    { name: 'toggleOff', fn: toggleOff },
    { name: 'success', fn: success },
    { name: 'error', fn: error },
    { name: 'warning', fn: warning },
    { name: 'hover', fn: hover },
    { name: 'pop', fn: pop },
    { name: 'swoosh', fn: swoosh },
    { name: 'notify', fn: notify },
  ]

  for (const { name, fn } of generators) {
    it(`${name} does not throw with soft theme`, () => {
      const ctx = createMockContext()
      const dest = createMockDest()
      expect(() => fn(ctx, dest, SOFT_THEME)).not.toThrow()
    })

    it(`${name} does not throw with crisp theme`, () => {
      const ctx = createMockContext()
      const dest = createMockDest()
      expect(() => fn(ctx, dest, CRISP_THEME)).not.toThrow()
    })
  }

  it('all generators are functions with correct signature', () => {
    for (const { fn } of generators) {
      expect(typeof fn).toBe('function')
      expect(fn.length).toBe(3)
    }
  })

  it('generators respect theme properties', () => {
    const shortTheme: TiksTheme = {
      ...SOFT_THEME,
      name: 'short',
      decay: 0.1,
    }
    // Should not throw with extreme decay values
    const ctx = createMockContext()
    const dest = createMockDest()
    for (const { fn } of generators) {
      expect(() => fn(ctx, dest, shortTheme)).not.toThrow()
    }
  })

  // ---------------------------------------------------------------------------
  // Characterization tests: pin exact envelopes, frequencies, and scheduling
  // ctx.currentTime = 0, SCHEDULE_OFFSET = 0.005, so now = 0.005 throughout
  // ---------------------------------------------------------------------------

  describe('toggleOn', () => {
    it('schedules a rising 0.8x→1.2x osc sweep with the documented envelope', () => {
      const ctx = new AudioContext()
      const dest = ctx.createGain()
      const oscSpy = vi.spyOn(ctx, 'createOscillator')
      const gainSpy = vi.spyOn(ctx, 'createGain')

      toggleOn(ctx, dest, SOFT_THEME)

      const now = 0.005
      const dur = 0.06 * SOFT_THEME.decay // 0.06

      // Osc voice (first oscillator)
      const osc = oscSpy.mock.results[0].value
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(SOFT_THEME.baseFreq * 0.8, now)
      expect(osc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(
        SOFT_THEME.baseFreq * 1.2,
        now + dur,
      )
      expect(osc.start).toHaveBeenCalledWith(now)
      expect(osc.stop).toHaveBeenCalledWith(now + dur)

      // Osc gain envelope: 0.001 → linearRamp(0.75, now+attack) → expRamp(0.001, now+dur)
      // gain index 0 = dest's gain (from createMockDest would be separate, but here dest is
      // created outside; the first createGain call inside toggleOn is the osc gain)
      // gainSpy.mock.results[0] is the osc gain
      const oscGain = gainSpy.mock.results[0].value
      expect(oscGain.gain.setValueAtTime).toHaveBeenCalledWith(0.001, now)
      expect(oscGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.75, now + SOFT_THEME.attack)
      expect(oscGain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, now + dur)
    })

    it('schedules a noise transient: gain 0.24 at now, expRamp to 0.001 at now+noiseDur', () => {
      const ctx = new AudioContext()
      const dest = ctx.createGain()
      const srcSpy = vi.spyOn(ctx, 'createBufferSource')
      const gainSpy = vi.spyOn(ctx, 'createGain')

      toggleOn(ctx, dest, SOFT_THEME)

      const now = 0.005
      const noiseDur = 0.01 * SOFT_THEME.decay // 0.01

      // Noise source (first bufferSource)
      const noise = srcSpy.mock.results[0].value
      expect(noise.start).toHaveBeenCalledWith(now)
      expect(noise.stop).toHaveBeenCalledWith(now + noiseDur)

      // Noise gain (second gain node created by toggleOn)
      const nGain = gainSpy.mock.results[1].value
      expect(nGain.gain.setValueAtTime).toHaveBeenCalledWith(0.24, now)
      expect(nGain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, now + noiseDur)
    })
  })

  describe('toggleOff', () => {
    it('schedules a falling 1.0x→0.6x osc sweep with the documented envelope', () => {
      const ctx = new AudioContext()
      const dest = ctx.createGain()
      const oscSpy = vi.spyOn(ctx, 'createOscillator')
      const gainSpy = vi.spyOn(ctx, 'createGain')

      toggleOff(ctx, dest, SOFT_THEME)

      const now = 0.005
      const dur = 0.06 * SOFT_THEME.decay // 0.06

      const osc = oscSpy.mock.results[0].value
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(SOFT_THEME.baseFreq, now)
      expect(osc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(
        SOFT_THEME.baseFreq * 0.6,
        now + dur,
      )
      expect(osc.start).toHaveBeenCalledWith(now)
      expect(osc.stop).toHaveBeenCalledWith(now + dur)

      const oscGain = gainSpy.mock.results[0].value
      expect(oscGain.gain.setValueAtTime).toHaveBeenCalledWith(0.001, now)
      expect(oscGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.75, now + SOFT_THEME.attack)
      expect(oscGain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, now + dur)
    })

    it('schedules a noise transient identical to toggleOn', () => {
      const ctx = new AudioContext()
      const dest = ctx.createGain()
      const srcSpy = vi.spyOn(ctx, 'createBufferSource')
      const gainSpy = vi.spyOn(ctx, 'createGain')

      toggleOff(ctx, dest, SOFT_THEME)

      const now = 0.005
      const noiseDur = 0.01 * SOFT_THEME.decay // 0.01

      const noise = srcSpy.mock.results[0].value
      expect(noise.start).toHaveBeenCalledWith(now)
      expect(noise.stop).toHaveBeenCalledWith(now + noiseDur)

      const nGain = gainSpy.mock.results[1].value
      expect(nGain.gain.setValueAtTime).toHaveBeenCalledWith(0.24, now)
      expect(nGain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, now + noiseDur)
    })
  })

  it('click uses bandpass at filterFreq/filterQ with 0.9 peak', () => {
    const ctx = new AudioContext()
    const dest = ctx.createGain()
    const filterSpy = vi.spyOn(ctx, 'createBiquadFilter')
    const srcSpy = vi.spyOn(ctx, 'createBufferSource')
    const gainSpy = vi.spyOn(ctx, 'createGain')

    click(ctx, dest, SOFT_THEME)

    const now = 0.005
    // dur = max(0.013 * 1.0, 0.005) = 0.013
    const dur = 0.013 * SOFT_THEME.decay
    // attack = min(theme.attack, dur * 0.5) = min(0.002, 0.0065) = 0.002
    const effectiveAttack = Math.min(SOFT_THEME.attack, dur * 0.5)

    const filter = filterSpy.mock.results[0].value
    expect(filter.type).toBe('bandpass')
    expect(filter.frequency.value).toBe(SOFT_THEME.filterFreq)
    expect(filter.Q.value).toBe(SOFT_THEME.filterQ)

    const gain = gainSpy.mock.results[0].value
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0.001, now)
    expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.9, now + effectiveAttack)
    expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, now + dur)

    const noise = srcSpy.mock.results[0].value
    expect(noise.start).toHaveBeenCalledWith(now)
    expect(noise.stop).toHaveBeenCalledWith(now + dur)
  })

  it('hover uses highpass at brightness with 0.3 peak', () => {
    const ctx = new AudioContext()
    const dest = ctx.createGain()
    const filterSpy = vi.spyOn(ctx, 'createBiquadFilter')
    const srcSpy = vi.spyOn(ctx, 'createBufferSource')
    const gainSpy = vi.spyOn(ctx, 'createGain')

    hover(ctx, dest, SOFT_THEME)

    const now = 0.005
    // dur = max(0.015 * 1.0, 0.005) = 0.015
    const dur = 0.015 * SOFT_THEME.decay
    // attack inside hover = min(0.002, 0.015 * 0.3) = min(0.002, 0.0045) = 0.002
    const effectiveAttack = Math.min(0.002, dur * 0.3)

    const filter = filterSpy.mock.results[0].value
    expect(filter.type).toBe('highpass')
    expect(filter.frequency.value).toBe(SOFT_THEME.brightness)

    const gain = gainSpy.mock.results[0].value
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0.001, now)
    expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.3, now + effectiveAttack)
    expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, now + dur)

    const noise = srcSpy.mock.results[0].value
    expect(noise.start).toHaveBeenCalledWith(now)
    expect(noise.stop).toHaveBeenCalledWith(now + dur)
  })

  it('pop sweeps 800→200 Hz (scaled) with 0.9 peak', () => {
    const ctx = new AudioContext()
    const dest = ctx.createGain()
    const oscSpy = vi.spyOn(ctx, 'createOscillator')
    const gainSpy = vi.spyOn(ctx, 'createGain')

    pop(ctx, dest, SOFT_THEME)

    const now = 0.005
    const scale = SOFT_THEME.baseFreq / 440 // 1.0
    // dur = max(0.08 * 1.0, 0.005) = 0.08
    const dur = 0.08 * SOFT_THEME.decay
    // attack = min(theme.attack, dur * 0.2) = min(0.002, 0.016) = 0.002
    const effectiveAttack = Math.min(SOFT_THEME.attack, dur * 0.2)

    const osc = oscSpy.mock.results[0].value
    expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(800 * scale, now)
    expect(osc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(200 * scale, now + dur)
    expect(osc.start).toHaveBeenCalledWith(now)
    expect(osc.stop).toHaveBeenCalledWith(now + dur)

    const gain = gainSpy.mock.results[0].value
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0.001, now)
    expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.9, now + effectiveAttack)
    expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, now + dur)
  })

  it('success plays two oscs at 523×scale and 784×scale, second delayed 0.08×decay, peaks 0.75', () => {
    const ctx = new AudioContext()
    const dest = ctx.createGain()
    const oscSpy = vi.spyOn(ctx, 'createOscillator')
    const gainSpy = vi.spyOn(ctx, 'createGain')

    success(ctx, dest, SOFT_THEME)

    const now = 0.005
    const scale = SOFT_THEME.baseFreq / 440 // 1.0
    // dur1 = max(0.1 * 1.0, 0.005) = 0.1
    const dur1 = Math.max(0.1 * SOFT_THEME.decay, 0.005)
    // delay = max(0.08 * 1.0, 0.005) = 0.08
    const delay = Math.max(0.08 * SOFT_THEME.decay, 0.005)
    // dur2 = max(0.15 * 1.0, 0.005) = 0.15
    const dur2 = Math.max(0.15 * SOFT_THEME.decay, 0.005)

    const osc1 = oscSpy.mock.results[0].value
    expect(osc1.frequency.value).toBe(523 * scale)
    expect(osc1.start).toHaveBeenCalledWith(now)
    expect(osc1.stop).toHaveBeenCalledWith(now + dur1)

    const gain1 = gainSpy.mock.results[0].value
    expect(gain1.gain.setValueAtTime).toHaveBeenCalledWith(0.001, now)
    expect(gain1.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.75, now + SOFT_THEME.attack)
    expect(gain1.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, now + dur1)

    const osc2 = oscSpy.mock.results[1].value
    expect(osc2.frequency.value).toBe(784 * scale)
    expect(osc2.start).toHaveBeenCalledWith(now + delay)
    expect(osc2.stop).toHaveBeenCalledWith(now + delay + dur2)

    const gain2 = gainSpy.mock.results[1].value
    expect(gain2.gain.setValueAtTime).toHaveBeenCalledWith(0.001, now + delay)
    expect(gain2.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.75, now + delay + SOFT_THEME.attack)
    expect(gain2.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, now + delay + dur2)
  })

  it('error sweeps osc 280→180 Hz (scaled), lowpass noise at 600 Hz with 0.45 peak', () => {
    const ctx = new AudioContext()
    const dest = ctx.createGain()
    const oscSpy = vi.spyOn(ctx, 'createOscillator')
    const filterSpy = vi.spyOn(ctx, 'createBiquadFilter')
    const srcSpy = vi.spyOn(ctx, 'createBufferSource')
    const gainSpy = vi.spyOn(ctx, 'createGain')

    error(ctx, dest, SOFT_THEME)

    const now = 0.005
    const scale = SOFT_THEME.baseFreq / 440 // 1.0
    // dur = max(0.15 * 1.0, 0.005) = 0.15
    const dur = Math.max(0.15 * SOFT_THEME.decay, 0.005)
    // noiseDur = max(0.1 * 1.0, 0.005) = 0.1
    const noiseDur = Math.max(0.1 * SOFT_THEME.decay, 0.005)

    const osc = oscSpy.mock.results[0].value
    expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(280 * scale, now)
    expect(osc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(180 * scale, now + dur)
    expect(osc.start).toHaveBeenCalledWith(now)
    expect(osc.stop).toHaveBeenCalledWith(now + dur)

    const oscGain = gainSpy.mock.results[0].value
    expect(oscGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.75, now + SOFT_THEME.attack)
    expect(oscGain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, now + dur)

    const filter = filterSpy.mock.results[0].value
    expect(filter.type).toBe('lowpass')
    expect(filter.frequency.value).toBe(600)

    const nGain = gainSpy.mock.results[1].value
    expect(nGain.gain.setValueAtTime).toHaveBeenCalledWith(0.45, now)
    expect(nGain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, now + noiseDur)

    const noise = srcSpy.mock.results[0].value
    expect(noise.start).toHaveBeenCalledWith(now)
    expect(noise.stop).toHaveBeenCalledWith(now + noiseDur)
  })

  it('warning plays two bursts at baseFreq×1.2 and baseFreq×1.2×1.0595 with 0.75 peak', () => {
    const ctx = new AudioContext()
    const dest = ctx.createGain()
    const oscSpy = vi.spyOn(ctx, 'createOscillator')
    const gainSpy = vi.spyOn(ctx, 'createGain')

    warning(ctx, dest, SOFT_THEME)

    const now = 0.005
    // noteDur = max(0.07 * 1.0, 0.005) = 0.07
    const noteDur = Math.max(0.07 * SOFT_THEME.decay, 0.005)
    // gap = max(0.1 * 1.0, 0.01) = 0.1
    const gap = Math.max(0.1 * SOFT_THEME.decay, 0.01)
    const baseFreq = SOFT_THEME.baseFreq * 1.2 // 528
    // attack = min(theme.attack, noteDur * 0.5) = min(0.002, 0.035) = 0.002
    const effectiveAttack = Math.min(SOFT_THEME.attack, noteDur * 0.5)

    // Burst 1
    const osc1 = oscSpy.mock.results[0].value
    expect(osc1.frequency.value).toBe(baseFreq)
    expect(osc1.start).toHaveBeenCalledWith(now)
    expect(osc1.stop).toHaveBeenCalledWith(now + noteDur)

    const gain1 = gainSpy.mock.results[0].value
    expect(gain1.gain.setValueAtTime).toHaveBeenCalledWith(0.001, now)
    expect(gain1.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.75, now + effectiveAttack)
    expect(gain1.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, now + noteDur)

    // Burst 2
    const t2 = now + gap
    const osc2 = oscSpy.mock.results[1].value
    expect(osc2.frequency.value).toBe(baseFreq * 1.0595)
    expect(osc2.start).toHaveBeenCalledWith(t2)
    expect(osc2.stop).toHaveBeenCalledWith(t2 + noteDur)

    const gain2 = gainSpy.mock.results[1].value
    expect(gain2.gain.setValueAtTime).toHaveBeenCalledWith(0.001, t2)
    expect(gain2.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.75, t2 + effectiveAttack)
    expect(gain2.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, t2 + noteDur)
  })

  it('notify plays oscs at baseFreq×2 and baseFreq×3, second delayed 0.1×decay, peaks 0.6', () => {
    const ctx = new AudioContext()
    const dest = ctx.createGain()
    const oscSpy = vi.spyOn(ctx, 'createOscillator')
    const gainSpy = vi.spyOn(ctx, 'createGain')

    notify(ctx, dest, SOFT_THEME)

    const now = 0.005
    // dur1 = max(0.18 * 1.0, 0.005) = 0.18
    const dur1 = Math.max(0.18 * SOFT_THEME.decay, 0.005)
    // dur2 = max(0.3 * 1.0, 0.005) = 0.3
    const dur2 = Math.max(0.3 * SOFT_THEME.decay, 0.005)
    // delay = max(0.1 * 1.0, 0.02) = 0.1
    const delay = Math.max(0.1 * SOFT_THEME.decay, 0.02)

    const osc1 = oscSpy.mock.results[0].value
    expect(osc1.frequency.value).toBe(SOFT_THEME.baseFreq * 2)
    expect(osc1.start).toHaveBeenCalledWith(now)
    expect(osc1.stop).toHaveBeenCalledWith(now + dur1)

    const gain1 = gainSpy.mock.results[0].value
    expect(gain1.gain.setValueAtTime).toHaveBeenCalledWith(0.001, now)
    expect(gain1.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.6, now + SOFT_THEME.attack)
    expect(gain1.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, now + dur1)

    const t2 = now + delay
    const osc2 = oscSpy.mock.results[1].value
    expect(osc2.frequency.value).toBe(SOFT_THEME.baseFreq * 3)
    expect(osc2.start).toHaveBeenCalledWith(t2)
    expect(osc2.stop).toHaveBeenCalledWith(t2 + dur2)

    const gain2 = gainSpy.mock.results[1].value
    expect(gain2.gain.setValueAtTime).toHaveBeenCalledWith(0.001, t2)
    expect(gain2.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.6, t2 + SOFT_THEME.attack)
    expect(gain2.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, t2 + dur2)
  })

  it('swoosh sweeps bandpass from filterFreq×2 → max(filterFreq×0.3, 20) with 0.6 peak', () => {
    const ctx = new AudioContext()
    const dest = ctx.createGain()
    const filterSpy = vi.spyOn(ctx, 'createBiquadFilter')
    const srcSpy = vi.spyOn(ctx, 'createBufferSource')
    const gainSpy = vi.spyOn(ctx, 'createGain')

    swoosh(ctx, dest, SOFT_THEME)

    const now = 0.005
    // dur = max(0.12 * 1.0, 0.005) = 0.12
    const dur = Math.max(0.12 * SOFT_THEME.decay, 0.005)
    // attack = min(theme.attack * 2, dur * 0.1) = min(0.004, 0.012) = 0.004
    const effectiveAttack = Math.min(SOFT_THEME.attack * 2, dur * 0.1)
    const sweepStart = SOFT_THEME.filterFreq * 2 // 6000
    const sweepEnd = Math.max(SOFT_THEME.filterFreq * 0.3, 20) // 900

    const filter = filterSpy.mock.results[0].value
    expect(filter.type).toBe('bandpass')
    expect(filter.Q.value).toBe(SOFT_THEME.filterQ)
    expect(filter.frequency.setValueAtTime).toHaveBeenCalledWith(sweepStart, now)
    expect(filter.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(sweepEnd, now + dur)

    const gain = gainSpy.mock.results[0].value
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0.001, now)
    expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.6, now + effectiveAttack)
    expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, now + dur)

    const noise = srcSpy.mock.results[0].value
    expect(noise.start).toHaveBeenCalledWith(now)
    expect(noise.stop).toHaveBeenCalledWith(now + dur)
  })
})
