import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

const toastStyles = {
  success: 'border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900 dark:text-green-200',
  error: 'border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-900 dark:text-red-200',
  info: 'border-primary-300 bg-primary-50 text-primary-800 dark:border-primary-700 dark:bg-primary-900 dark:text-primary-200',
  warning: 'border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900 dark:text-yellow-200',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => removeToast(id), 5000)
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-20 z-[100] flex w-80 flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto animate-fade-in rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${toastStyles[toast.type]}`}
            role="alert"
          >
            <div className="flex items-start justify-between gap-2">
              <span>{toast.message}</span>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="opacity-60 hover:opacity-100"
                aria-label="Dismiss"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider')
  }
  return context
}