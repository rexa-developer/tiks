import { describe, it, expect, vi, afterEach } from 'vitest'
import { audioEngine } from '../engine'
import * as generators from '../generators'
import { bindTiks } from '../bind'

describe('bindTiks', () => {
  let unbind: (() => void) | undefined

  afterEach(() => {
    unbind?.()
    unbind = undefined
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('click: <button data-tiks="click"> fires playSound with generators.click', () => {
    const spy = vi.spyOn(audioEngine, 'playSound')
    document.body.innerHTML = '<button data-tiks="click">Save</button>'
    unbind = bindTiks()

    const btn = document.body.querySelector('button')!
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(spy).toHaveBeenCalledOnce()
    expect(spy.mock.calls[0][0]).toBe(generators.click)
  })

  it('nested child: click on child of annotated element still fires (closest)', () => {
    const spy = vi.spyOn(audioEngine, 'playSound')
    document.body.innerHTML = '<button data-tiks="click"><span>label</span></button>'
    unbind = bindTiks()

    const span = document.body.querySelector('span')!
    span.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(spy).toHaveBeenCalledOnce()
    expect(spy.mock.calls[0][0]).toBe(generators.click)
  })

  it('toggle checkbox: newly checked plays toggleOn; unchecked plays toggleOff', () => {
    const spy = vi.spyOn(audioEngine, 'playSound')
    // Checkbox starts unchecked; jsdom toggles checked state when click event is dispatched,
    // so the handler sees el.checked = true on first click, false on second.
    document.body.innerHTML = '<input type="checkbox" data-tiks="toggle">'
    unbind = bindTiks()

    const cb = document.body.querySelector('input')! as HTMLInputElement

    // First click: jsdom toggles checkbox to checked=true during event dispatch
    cb.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0]).toBe(generators.toggleOn)

    spy.mockClear()
    // Second click: jsdom toggles checkbox back to checked=false
    cb.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0]).toBe(generators.toggleOff)
  })

  it('toggle aria-pressed="true" button plays toggleOn', () => {
    const spy = vi.spyOn(audioEngine, 'playSound')
    document.body.innerHTML = '<button data-tiks="toggle" aria-pressed="true">Toggle</button>'
    unbind = bindTiks()

    const btn = document.body.querySelector('button')!
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(spy).toHaveBeenCalledOnce()
    expect(spy.mock.calls[0][0]).toBe(generators.toggleOn)
  })

  it('unknown value: silently ignored, no playSound call, no throw', () => {
    const spy = vi.spyOn(audioEngine, 'playSound')
    document.body.innerHTML = '<button data-tiks="kaboom">Kaboom</button>'
    unbind = bindTiks()

    const btn = document.body.querySelector('button')!
    expect(() => btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow()
    expect(spy).not.toHaveBeenCalled()
  })

  it('element without data-tiks: no playSound call', () => {
    const spy = vi.spyOn(audioEngine, 'playSound')
    document.body.innerHTML = '<button>No attr</button>'
    unbind = bindTiks()

    const btn = document.body.querySelector('button')!
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(spy).not.toHaveBeenCalled()
  })

  it('unbind: after calling the returned function, clicks no longer play', () => {
    const spy = vi.spyOn(audioEngine, 'playSound')
    document.body.innerHTML = '<button data-tiks="click">Save</button>'
    unbind = bindTiks()

    // Confirm it works before unbind
    const btn = document.body.querySelector('button')!
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(spy).toHaveBeenCalledTimes(1)

    // Unbind and confirm no more calls
    unbind()
    unbind = undefined
    spy.mockClear()
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(spy).not.toHaveBeenCalled()
  })

  it('hover: data-tiks="hover" routes through playHover (not playSound directly)', () => {
    const hoverSpy = vi.spyOn(audioEngine, 'playHover')
    document.body.innerHTML = '<button data-tiks="hover">Hover</button>'
    unbind = bindTiks()

    const btn = document.body.querySelector('button')!
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(hoverSpy).toHaveBeenCalledOnce()
    expect(hoverSpy.mock.calls[0][0]).toBe(generators.hover)
  })
})
