/**
 * Regression tests for the gesture-unlock dead-end bug (plan 006).
 *
 * Each test uses a fresh engine module via vi.resetModules() + dynamic import
 * to avoid the singleton from leaking state between cases.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('gesture unlock', () => {
  it('retries after resume resolves but context stays suspended (regression)', async () => {
    // Simulate iOS: resume() resolves but state never transitions to 'running'
    class StuckSuspendedContext extends (globalThis.AudioContext as any) {
      state: AudioContextState = 'suspended'
      resume = vi.fn(() => Promise.resolve())
    }
    vi.stubGlobal('AudioContext', StuckSuspendedContext)

    const { audioEngine } = await import('../engine')
    audioEngine.init()

    // First gesture — resume is called, promise resolves, but state is still 'suspended'
    document.dispatchEvent(new Event('pointerdown'))
    await Promise.resolve() // flush the resume microtask

    // Second gesture — should be allowed because unlocking was reset
    document.dispatchEvent(new Event('pointerdown'))

    const ctx = audioEngine.getContext() as unknown as { resume: ReturnType<typeof vi.fn> }
    expect(ctx.resume).toHaveBeenCalledTimes(2)
  })

  it('tears down listeners when resume resolves and context is running', async () => {
    // Context transitions to 'running' inside the resolve callback (normal path)
    class RunningAfterResumeContext extends (globalThis.AudioContext as any) {
      state: AudioContextState = 'suspended'
      resume = vi.fn(() => {
        this.state = 'running'
        return Promise.resolve()
      })
    }
    vi.stubGlobal('AudioContext', RunningAfterResumeContext)

    const { audioEngine } = await import('../engine')
    audioEngine.init()

    document.dispatchEvent(new Event('pointerdown'))
    await Promise.resolve() // flush resolve, teardown fires

    // After teardown, further gestures should NOT trigger resume
    const ctx = audioEngine.getContext() as unknown as { resume: ReturnType<typeof vi.fn> }
    ctx.resume.mockClear()
    document.dispatchEvent(new Event('pointerdown'))

    expect(ctx.resume).not.toHaveBeenCalled()
  })

  it('allows retry when resume rejects (existing rejection path)', async () => {
    // resume() rejects — unlocking is reset in the rejection handler
    class RejectingContext extends (globalThis.AudioContext as any) {
      state: AudioContextState = 'suspended'
      resume = vi.fn(() => Promise.reject(new Error('not allowed')))
    }
    vi.stubGlobal('AudioContext', RejectingContext)

    const { audioEngine } = await import('../engine')
    audioEngine.init()

    document.dispatchEvent(new Event('pointerdown'))
    await Promise.resolve() // flush rejection microtask

    document.dispatchEvent(new Event('pointerdown'))

    const ctx = audioEngine.getContext() as unknown as { resume: ReturnType<typeof vi.fn> }
    expect(ctx.resume).toHaveBeenCalledTimes(2)
  })
})
