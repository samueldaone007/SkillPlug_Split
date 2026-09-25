import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { useNotifications } from '../context/NotificationsContext'
import { useToast } from './Toast'
import { formatRelativeTime, getErrorMessage } from '../utils/format'

const TYPE_COLORS = {
  verification: 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200',
  application: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
  review: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200',
  message: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
  system: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
}

const TYPE_BADGES = {
  verification: 'ID',
  application: 'AP',
  review: 'RV',
  message: 'MS',
  system: 'SP',
}

export default function NotificationBell() {
  const { notifications, unread, markRead, markAllRead, loadMore, hasMore, loadingMore, primeAudio, testChime } = useNotifications()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    if (!open) {
      setActionError('')
      return undefined
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  const handleItemClick = async (n) => {
    primeAudio()
    if (!n.is_read) {
      try {
        setActionError('')
        await markRead(n.id)
      } catch (err) {
        setActionError(`Read failed: ${getErrorMessage(err)}`)
        showToast('Could not mark as read. Refresh the page and try again.', 'error')
      }
    }
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  const handleMarkAllRead = async () => {
    primeAudio()
    try {
      setActionError('')
      await markAllRead()
      showToast('All notifications marked as read.', 'success')
    } catch (err) {
      setActionError(`Mark all failed: ${getErrorMessage(err)}`)
      showToast('Could not mark notifications as read. Try again.', 'error')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          primeAudio()
          setOpen(!open)
        }}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true">
            <button
              type="button"
              aria-label="Close notifications"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/40"
            />
            <aside className="animate-slide-in-right absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-white shadow-2xl dark:bg-gray-900">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</p>
                  {unread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unread > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {actionError && (
                <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-700 dark:bg-red-900 dark:text-red-200">
                  {actionError}
                </div>
              )}

              {/* List */}
              <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {notifications.map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => handleItemClick(n)}
                          className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                            n.is_read ? '' : 'bg-primary-50/50 dark:bg-primary-900/10'
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${TYPE_COLORS[n.notification_type] || TYPE_COLORS.system}`}
                          >
                            {TYPE_BADGES[n.notification_type] || TYPE_BADGES.system}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm text-gray-800 dark:text-gray-200">{n.message}</span>
                            <span className="mt-0.5 block text-xs text-gray-400 dark:text-gray-500">
                              {formatRelativeTime(n.created_at)}
                            </span>
                          </span>
                          {!n.is_read && (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-500" />
                          )}
                        </button>
                      </li>
                    ))}
                    {hasMore && (
                      <li className="p-2">
                        <button
                          type="button"
                          onClick={loadMore}
                          disabled={loadingMore}
                          className="w-full rounded-lg py-2 text-center text-xs font-medium text-primary-600 hover:bg-primary-50 disabled:opacity-50 dark:text-primary-400 dark:hover:bg-gray-700/50"
                        >
                          {loadingMore ? 'Loading…' : 'Load more'}
                        </button>
                      </li>
                    )}
                  </ul>
                )}
              </div>

              {/* Footer */}
              <div className="space-y-1 border-t border-gray-100 p-3 dark:border-gray-700">
                <Link
                  to="/notifications"
                  onClick={() => setOpen(false)}
                  className="block w-full rounded-lg py-2 text-center text-sm font-medium text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-gray-700/50"
                >
                  View all notifications
                </Link>
                <button
                  type="button"
                  onClick={testChime}
                  className="w-full rounded-lg py-2 text-center text-xs font-medium text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700/50"
                >
                  Test notification sound
                </button>
              </div>
            </aside>
          </div>,
          document.body
        )}
    </>
  )
}