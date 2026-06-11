import { describe, it, expect, beforeEach, vi } from 'vitest'

type Listener = () => void

const testTheme = {
  name: 'test', baseFreq: 440, noiseColor: 'white' as const,
  oscType: 'sine' as const, filterFreq: 3000, filterQ: 0.7,
  attack: 0.002, decay: 1.0, brightness: 200,
}

function installMatchMedia(initialMatches: boolean) {
  let matches = initialMatches
  const listeners = new Set<Listener>()
  const mql = {
    get matches() { return matches },
    addEventListener: (_: string, fn: Listener) => { listeners.add(fn) },
    removeEventListener: (_: string, fn: Listener) => { listeners.delete(fn) },
  }
  vi.stubGlobal('matchMedia', vi.fn(() => mql))
  return {
    setMatches(v: boolean) { matches = v; listeners.forEach(fn => fn()) },
  }
}

async function freshEngine() {
  vi.resetModules()
  const mod = await import('../engine')
  return mod.audioEngine
}

beforeEach(() => { vi.unstubAllGlobals() })

describe('reduced-motion opt-out', () => {
  it('default respects the preference: matchMedia matches=true → isMuted() is true; generator not called', async () => {
    installMatchMedia(true)
    const engine = await freshEngine()
    engine.init()
    document.dispatchEvent(new Event('pointerdown'))

    expect(engine.isMuted()).toBe(true)

    const generator = vi.fn()
    engine.playSound(generator, testTheme)
    expect(generator).not.toHaveBeenCalled()
  })

  it('explicit opt-out works on first init: matches=true → init({ respectReducedMotion: false }) → isMuted() false; generator called', async () => {
    installMatchMedia(true)
    const engine = await freshEngine()
    engine.init({ respectReducedMotion: false })
    document.dispatchEvent(new Event('pointerdown'))

    expect(engine.isMuted()).toBe(false)

    const generator = vi.fn()
    engine.playSound(generator, testTheme)
    expect(generator).toHaveBeenCalledOnce()
  })

  it('the bug this plan fixes — opt-out after a default init: init() then init({ respectReducedMotion: false }) → isMuted() false; generator called', async () => {
    installMatchMedia(true)
    const engine = await freshEngine()
    engine.init()
    engine.init({ respectReducedMotion: false })
    document.dispatchEvent(new Event('pointerdown'))

    expect(engine.isMuted()).toBe(false)

    const generator = vi.fn()
    engine.playSound(generator, testTheme)
    expect(generator).toHaveBeenCalledOnce()
  })

  it('optionless init does not clobber an explicit opt-out: init({ respectReducedMotion: false }) then init() → isMuted() still false', async () => {
    installMatchMedia(true)
    const engine = await freshEngine()
    engine.init({ respectReducedMotion: false })
    engine.init()
    document.dispatchEvent(new Event('pointerdown'))

    expect(engine.isMuted()).toBe(false)

    const generator = vi.fn()
    engine.playSound(generator, testTheme)
    expect(generator).toHaveBeenCalledOnce()
  })

  it('runtime preference change: matches=false → generator called; setMatches(true) → not called; setMatches(false) → called again', async () => {
    const media = installMatchMedia(false)
    const engine = await freshEngine()
    engine.init()
    document.dispatchEvent(new Event('pointerdown'))

    const generator = vi.fn()

    // Initially not reduced-motion, should play
    engine.playSound(generator, testTheme)
    expect(generator).toHaveBeenCalledTimes(1)

    // OS preference switches to reduced-motion
    media.setMatches(true)
    engine.playSound(generator, testTheme)
    expect(generator).toHaveBeenCalledTimes(1) // still 1, not called again

    // OS preference reverts
    media.setMatches(false)
    engine.playSound(generator, testTheme)
    expect(generator).toHaveBeenCalledTimes(2)
  })

  it('unmute() does not override the preference: matches=true → init() → unmute() → isMuted() still true', async () => {
    installMatchMedia(true)
    const engine = await freshEngine()
    engine.init()
    document.dispatchEvent(new Event('pointerdown'))

    engine.unmute()
    expect(engine.isMuted()).toBe(true)
  })
})
