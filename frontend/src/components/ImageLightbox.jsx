import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function ImageLightbox({ src, alt, onClose }) {
  useEffect(() => {
    if (!src) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [src, onClose])

  if (!src) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close image" onClick={onClose} className="absolute inset-0 bg-black/80" />
      <div className="animate-fade-in relative max-h-full max-w-full">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -right-2.5 -top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-700 shadow-lg hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <img
          src={src}
          alt={alt || 'Image'}
          className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
        />
      </div>
    </div>,
    document.body
  )
}