import { describe, it, expect, vi, afterEach } from 'vitest'
import { audioEngine } from '../engine'
import { TiksEngine } from '../tiks'

const testTheme = {
  name: 'test', baseFreq: 440, noiseColor: 'white' as const,
  oscType: 'sine' as const, filterFreq: 3000, filterQ: 0.7,
  attack: 0.002, decay: 1.0, brightness: 200,
}

describe('AudioEngine', () => {
  it('init does not create AudioContext until first user gesture', () => {
    audioEngine.init()
    expect(audioEngine.getContext()).toBeNull()
    expect(audioEngine.getMasterGain()).toBeNull()
  })

  it('sets default volume to 0.3', () => {
    expect(audioEngine.getVolume()).toBe(0.3)
  })

  it('applies init volume to gain node once context exists', () => {
    audioEngine.init({ volume: 0.7 })
    // Force creation without dispatching a real gesture, so the gesture-unlock
    // listener stays bound for the dedicated tests below.
    ;(audioEngine as unknown as { createContext: () => AudioContext }).createContext()
    expect(audioEngine.getContext()).toBeTruthy()
    expect(audioEngine.getMasterGain()!.gain.value).toBeCloseTo(0.7)
    audioEngine.setVolume(0.3)
  })

  it('mute/unmute toggles state', () => {
    audioEngine.unmute()
    expect(audioEngine.isMuted()).toBe(false)
    audioEngine.mute()
    expect(audioEngine.isMuted()).toBe(true)
    audioEngine.unmute()
    expect(audioEngine.isMuted()).toBe(false)
  })

  it('setVolume updates gain value', () => {
    audioEngine.init()
    audioEngine.setVolume(0.8)
    expect(audioEngine.getMasterGain()!.gain.value).toBeCloseTo(0.8)
    expect(audioEngine.getVolume()).toBe(0.8)
    audioEngine.setVolume(0.3)
  })

  it('playSound is a no-op when muted', () => {
    audioEngine.init()
    audioEngine.mute()

    const generator = vi.fn()
    audioEngine.playSound(generator, testTheme)
    expect(generator).not.toHaveBeenCalled()
    audioEngine.unmute()
  })

  it('playSound calls generator when not muted', () => {
    audioEngine.init()
    audioEngine.unmute()

    const generator = vi.fn()
    audioEngine.playSound(generator, testTheme)
    expect(generator).toHaveBeenCalledOnce()
    expect(generator).toHaveBeenCalledWith(
      audioEngine.getContext(),
      audioEngine.getMasterGain(),
      testTheme,
    )
  })

  it('mutes when init with muted option', () => {
    audioEngine.init({ muted: true })
    expect(audioEngine.isMuted()).toBe(true)
    audioEngine.unmute()
  })

  it('init({ muted: false }) unmutes after init({ muted: true })', () => {
    audioEngine.init({ muted: true })
    expect(audioEngine.isMuted()).toBe(true)
    audioEngine.init({ muted: false })
    expect(audioEngine.isMuted()).toBe(false)
    audioEngine.unmute()
  })

  it('init() without muted option does not clobber existing mute state', () => {
    audioEngine.init({ muted: true })
    expect(audioEngine.isMuted()).toBe(true)
    audioEngine.init()
    expect(audioEngine.isMuted()).toBe(true)
    audioEngine.unmute()
  })

  it('init({ muted: false }) allows playSound to call the generator', () => {
    audioEngine.init({ muted: true })
    audioEngine.init({ muted: false })
    const generator = vi.fn()
    audioEngine.playSound(generator, testTheme)
    expect(generator).toHaveBeenCalledOnce()
    audioEngine.unmute()
  })

  it('resumes suspended context on pageshow (bfcache restore)', () => {
    audioEngine.init()
    const ctx = audioEngine.getContext() as unknown as { state: AudioContextState; resume: ReturnType<typeof vi.fn> }
    ctx.resume.mockClear()
    ctx.state = 'suspended'

    window.dispatchEvent(new Event('pageshow'))
    expect(ctx.resume).toHaveBeenCalled()

    ctx.state = 'running'
  })

  it('does not call generator when context is still suspended', () => {
    audioEngine.init()
    audioEngine.unmute()
    const ctx = audioEngine.getContext() as unknown as { state: AudioContextState; resume: ReturnType<typeof vi.fn> }
    ctx.state = 'suspended'
    ctx.resume.mockImplementationOnce(() => Promise.reject(new Error('no gesture')))

    const generator = vi.fn()
    audioEngine.playSound(generator, testTheme)
    expect(generator).not.toHaveBeenCalled()

    ctx.state = 'running'
  })

  it('gesture unlock: dispatches silent buffer on pointerdown and resumes ctx', () => {
    audioEngine.init()
    const ctx = audioEngine.getContext() as unknown as {
      state: AudioContextState
      resume: ReturnType<typeof vi.fn>
      createBuffer: ReturnType<typeof vi.fn>
      createBufferSource: ReturnType<typeof vi.fn>
    }
    ctx.state = 'suspended'
    ctx.resume.mockClear()
    const createBufferSpy = vi.spyOn(ctx, 'createBuffer')
    const createSourceSpy = vi.spyOn(ctx, 'createBufferSource')

    document.dispatchEvent(new Event('pointerdown'))

    expect(ctx.resume).toHaveBeenCalled()
    expect(createBufferSpy).toHaveBeenCalledWith(1, 1, 22050)
    expect(createSourceSpy).toHaveBeenCalled()
    const src = createSourceSpy.mock.results[0]?.value as { start: ReturnType<typeof vi.fn> }
    expect(src.start).toHaveBeenCalled()

    ctx.state = 'running'
  })

  it('gesture unlock: unbinds listener once ctx is running', () => {
    audioEngine.init()
    const ctx = audioEngine.getContext() as unknown as {
      state: AudioContextState
      resume: ReturnType<typeof vi.fn>
    }
    ctx.state = 'running'

    document.dispatchEvent(new Event('pointerdown'))
    ctx.resume.mockClear()
    document.dispatchEvent(new Event('pointerdown'))
    expect(ctx.resume).not.toHaveBeenCalled()
  })
})

describe('AudioEngine – hover throttling', () => {
  const testTheme = {
    name: 'test', baseFreq: 440, noiseColor: 'white' as const,
    oscType: 'sine' as const, filterFreq: 3000, filterQ: 0.7,
    attack: 0.002, decay: 1.0, brightness: 200,
  }

  afterEach(() => {
    // Restore any mocked performance.now and reset throttle to default
    vi.restoreAllMocks()
    audioEngine.init({ hoverThrottleMs: 80 })
  })

  it('two playHover calls 10 ms apart → generator called once', () => {
    // Advance clock well past default window to clear any residual _lastHoverAt
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(10_000)
    audioEngine.init({ hoverThrottleMs: 80 })
    const generator = vi.fn()

    audioEngine.playHover(generator, testTheme)  // t=10000 → plays
    nowSpy.mockReturnValue(10_010)
    audioEngine.playHover(generator, testTheme)  // t=10010, delta=10 < 80 → blocked

    expect(generator).toHaveBeenCalledOnce()
  })

  it('two playHover calls 100 ms apart → generator called twice', () => {
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(20_000)
    audioEngine.init({ hoverThrottleMs: 80 })
    const generator = vi.fn()

    audioEngine.playHover(generator, testTheme)  // t=20000 → plays
    nowSpy.mockReturnValue(20_100)
    audioEngine.playHover(generator, testTheme)  // t=20100, delta=100 > 80 → plays

    expect(generator).toHaveBeenCalledTimes(2)
  })

  it('init({ hoverThrottleMs: 0 }) → two immediate calls both play', () => {
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(30_000)
    audioEngine.init({ hoverThrottleMs: 0 })
    const generator = vi.fn()

    audioEngine.playHover(generator, testTheme)
    nowSpy.mockReturnValue(30_000)  // same time, delta=0, but 0 < 0 is false → plays
    audioEngine.playHover(generator, testTheme)

    expect(generator).toHaveBeenCalledTimes(2)
  })

  it('init({ hoverThrottleMs: 200 }): call at +100 ms blocked, at +250 ms plays', () => {
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(40_000)
    audioEngine.init({ hoverThrottleMs: 200 })
    const generator = vi.fn()

    audioEngine.playHover(generator, testTheme)  // t=40000 → plays
    nowSpy.mockReturnValue(40_100)
    audioEngine.playHover(generator, testTheme)  // delta=100 < 200 → blocked
    expect(generator).toHaveBeenCalledOnce()

    nowSpy.mockReturnValue(40_250)
    audioEngine.playHover(generator, testTheme)  // delta=250 > 200 → plays
    expect(generator).toHaveBeenCalledTimes(2)
  })

  it('throttle is global: two TiksEngine instances hovering within 10 ms → playSound called once', () => {
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(50_000)
    audioEngine.init({ hoverThrottleMs: 80 })

    const playSoundSpy = vi.spyOn(audioEngine, 'playSound')
    const engine1 = new TiksEngine()
    const engine2 = new TiksEngine()

    engine1.hover()  // t=50000 → passes throttle, calls playSound
    nowSpy.mockReturnValue(50_010)
    engine2.hover()  // t=50010, delta=10 < 80 → blocked, playSound NOT called again

    expect(playSoundSpy).toHaveBeenCalledOnce()
    playSoundSpy.mockRestore()
  })
})
