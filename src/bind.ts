import { tiks } from './tiks'

const SOUNDS: Record<string, () => void> = {
  click: () => tiks.click(),
  success: () => tiks.success(),
  error: () => tiks.error(),
  warning: () => tiks.warning(),
  hover: () => tiks.hover(),
  pop: () => tiks.pop(),
  swoosh: () => tiks.swoosh(),
  notify: () => tiks.notify(),
  'toggle-on': () => tiks.toggle(true),
  'toggle-off': () => tiks.toggle(false),
}

export function bindTiks(root: Document | Element = document): () => void {
  tiks.init()

  const handler = (event: Event) => {
    const el = (event.target as Element | null)?.closest?.('[data-tiks]')
    if (!el) return

    const value = el.getAttribute('data-tiks')
    if (!value) return

    if (value === 'toggle') {
      const state = el instanceof HTMLInputElement ? el.checked : el.getAttribute('aria-pressed') === 'true'
      tiks.toggle(state)
      return
    }

    SOUNDS[value]?.()
  }

  root.addEventListener('click', handler)

  return () => {
    root.removeEventListener('click', handler)
  }
}
