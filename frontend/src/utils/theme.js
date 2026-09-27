export const THEMES = [
  {
    id: 'classic',
    label: 'Classic',
    tagline: 'Clean emerald, soft & calm',
    swatch: ['#10b981', '#ffffff', '#d1fae5'],
  },
  {
    id: 'glassy',
    label: 'Glassy',
    tagline: 'Violet glassmorphism, gradients',
    swatch: ['#7c3aed', '#d946ef', '#a78bfa'],
  },
  {
    id: 'brutal',
    label: 'Brutal',
    tagline: 'Bold neo-brutalist',
    swatch: ['#ffe11a', '#161616', '#ff4785'],
  },
]

const KEY = 'skillplug-theme'

const listeners = new Set()

export function getTheme() {
  if (typeof document !== 'undefined') {
    const current = document.documentElement.getAttribute('data-theme')
    if (current && THEMES.some((t) => t.id === current)) return current
  }
  try {
    return localStorage.getItem(KEY) || 'brutal'
  } catch {
    return 'brutal'
  }
}

export function applyTheme(theme) {
  const id = THEMES.some((t) => t.id === theme) ? theme : 'brutal'
  document.documentElement.setAttribute('data-theme', id)
  try {
    localStorage.setItem(KEY, id)
  } catch {
    // ignore
  }
  listeners.forEach((fn) => {
    try {
      fn(id)
    } catch {
      // ignore
    }
  })
  return id
}

export function initTheme() {
  applyTheme(getTheme())
}

export function subscribeTheme(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}