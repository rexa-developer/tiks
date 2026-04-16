import { describe, it, expect } from 'vitest'
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
})
