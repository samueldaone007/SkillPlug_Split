import { useState, useEffect, useRef } from 'react'
import { THEMES, getTheme, applyTheme } from '../utils/theme'

export default function ThemeSwitcher() {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState(getTheme())
  const ref = useRef(null)

  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const select = (id) => {
    applyTheme(id)
    setCurrent(id)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Change theme"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Change theme"
        className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <div className="card absolute right-0 z-50 mt-2 w-60 p-2" role="menu" aria-label="Theme options">
          <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Choose your look
          </p>
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="menuitemradio"
              aria-checked={current === t.id}
              onClick={() => select(t.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${current === t.id ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-700/60'}`}
            >
              <span className="flex -space-x-1">
                {t.swatch.map((c) => (
                  <span
                    key={c}
                    className="h-5 w-5 rounded-full border border-gray-300 dark:border-gray-600"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-gray-900 dark:text-white">{t.label}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">{t.tagline}</span>
              </span>
              {current === t.id && (
                <svg className="h-4 w-4 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}