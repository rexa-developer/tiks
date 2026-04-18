import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { useTiks } from '../vue'

function renderComposable<T>(setupFn: () => T) {
  const TestComponent = defineComponent({
    setup() {
      const result = setupFn()
      return { result }
    },
    render() {
      return null
    },
  })
  const wrapper = mount(TestComponent)
  return {
    result: wrapper.vm.result as T,
    rerender: () => wrapper.vm.$forceUpdate(),
  }
}

describe('vue composable useTiks', () => {
  it('returns all sound methods', () => {
    const { result } = renderComposable(() => useTiks())

    expect(typeof result.click).toBe('function')
    expect(typeof result.toggle).toBe('function')
    expect(typeof result.success).toBe('function')
    expect(typeof result.error).toBe('function')
    expect(typeof result.warning).toBe('function')
    expect(typeof result.hover).toBe('function')
    expect(typeof result.pop).toBe('function')
    expect(typeof result.swoosh).toBe('function')
    expect(typeof result.notify).toBe('function')
  })

  it('returns control methods', () => {
    const { result } = renderComposable(() => useTiks())

    expect(typeof result.mute).toBe('function')
    expect(typeof result.unmute).toBe('function')
    expect(typeof result.setVolume).toBe('function')
    expect(typeof result.setTheme).toBe('function')
  })

  it('returns stable references across re-renders', () => {
    const { result, rerender } = renderComposable(() => useTiks())

    const firstClick = result.click
    rerender()
    expect(result.click).toBe(firstClick)
  })

  it('sound methods do not throw', () => {
    const { result } = renderComposable(() => useTiks())

    expect(() => result.click()).not.toThrow()
    expect(() => result.toggle(true)).not.toThrow()
    expect(() => result.success()).not.toThrow()
  })
})
