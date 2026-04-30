import { describe, it, expect, vi } from 'vitest'
import { audioEngine } from '../engine'

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
