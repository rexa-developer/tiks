import { vi } from 'vitest'

// Minimal AudioContext mock for testing
class MockGainNode {
  gain = { value: 1, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }
  connect = vi.fn(() => this)
  disconnect = vi.fn()
}

class MockOscillatorNode {
  type: OscillatorType = 'sine'
  frequency = { value: 440, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }
  connect = vi.fn(() => this)
  disconnect = vi.fn()
  start = vi.fn()
  stop = vi.fn()
}

class MockBiquadFilterNode {
  type: BiquadFilterType = 'lowpass'
  frequency = { value: 350, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }
  Q = { value: 1, setValueAtTime: vi.fn() }
  connect = vi.fn(() => this)
  disconnect = vi.fn()
}

class MockAudioBufferSourceNode {
  buffer: AudioBuffer | null = null
  connect = vi.fn(() => this)
  disconnect = vi.fn()
  start = vi.fn()
  stop = vi.fn()
}

class MockAudioBuffer {
  private channels: Float32Array[]
  readonly length: number
  readonly numberOfChannels: number
  readonly sampleRate: number
  readonly duration: number

  constructor(options: { numberOfChannels: number; length: number; sampleRate: number }) {
    this.numberOfChannels = options.numberOfChannels
    this.length = options.length
    this.sampleRate = options.sampleRate
    this.duration = options.length / options.sampleRate
    this.channels = Array.from({ length: options.numberOfChannels }, () => new Float32Array(options.length))
  }

  getChannelData(channel: number): Float32Array {
    return this.channels[channel]
  }

  copyFromChannel = vi.fn()
  copyToChannel = vi.fn()
}

class MockAudioContext {
  sampleRate = 44100
  currentTime = 0
  state: AudioContextState = 'running'
  destination = { connect: vi.fn() }

  createGain() {
    return new MockGainNode() as unknown as GainNode
  }

  createOscillator() {
    return new MockOscillatorNode() as unknown as OscillatorNode
  }

  createBiquadFilter() {
    return new MockBiquadFilterNode() as unknown as BiquadFilterNode
  }

  createBufferSource() {
    return new MockAudioBufferSourceNode() as unknown as AudioBufferSourceNode
  }

  createBuffer(channels: number, length: number, sampleRate: number) {
    return new MockAudioBuffer({ numberOfChannels: channels, length, sampleRate }) as unknown as AudioBuffer
  }

  resume = vi.fn(() => Promise.resolve())
  close = vi.fn(() => Promise.resolve())
}

// @ts-expect-error - mock
globalThis.AudioContext = MockAudioContext
// @ts-expect-error - mock
globalThis.AudioBuffer = MockAudioBuffer
