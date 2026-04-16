import { describe, it, expect, vi } from 'vitest'
import { audioEngine } from '../engine'

describe('AudioEngine', () => {
  it('creates AudioContext and GainNode on init', () => {
    audioEngine.init()
    expect(audioEngine.getContext()).toBeTruthy()
    expect(audioEngine.getMasterGain()).toBeTruthy()
  })

  it('sets default volume to 0.3', () => {
    expect(audioEngine.getVolume()).toBe(0.3)
  })

  it('sets custom volume from options', () => {
    audioEngine.init({ volume: 0.7 })
    expect(audioEngine.getMasterGain()!.gain.value).toBeCloseTo(0.7)
    // Reset
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
    const theme = {
      name: 'test', baseFreq: 440, noiseColor: 'white' as const,
      oscType: 'sine' as const, filterFreq: 3000, filterQ: 0.7,
      attack: 0.002, decay: 1.0, brightness: 200,
    }

    audioEngine.playSound(generator, theme)
    expect(generator).not.toHaveBeenCalled()
    audioEngine.unmute()
  })

  it('playSound calls generator when not muted', () => {
    audioEngine.init()
    audioEngine.unmute()

    const generator = vi.fn()
    const theme = {
      name: 'test', baseFreq: 440, noiseColor: 'white' as const,
      oscType: 'sine' as const, filterFreq: 3000, filterQ: 0.7,
      attack: 0.002, decay: 1.0, brightness: 200,
    }

    audioEngine.playSound(generator, theme)
    expect(generator).toHaveBeenCalledOnce()
    expect(generator).toHaveBeenCalledWith(
      audioEngine.getContext(),
      audioEngine.getMasterGain(),
      theme,
    )
  })

  it('mutes when init with muted option', () => {
    audioEngine.init({ muted: true })
    expect(audioEngine.isMuted()).toBe(true)
    audioEngine.unmute()
  })
})
