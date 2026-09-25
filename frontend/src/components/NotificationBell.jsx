import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../context/NotificationsContext'
import { formatRelativeTime } from '../utils/format'

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
  const { notifications, unread, open, setOpen, markRead, markAllRead, loadMore, hasMore, loadingMore } = useNotifications()
  const navigate = useNavigate()
  const wrapperRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, setOpen])

  const handleItemClick = (n) => {
    if (!n.is_read) markRead(n.id)
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
      >
        {/* Bell */}
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
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
              </ul>
            )}
          </div>

          {hasMore && (
            <div className="border-t border-gray-100 p-2 dark:border-gray-700">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full rounded-lg py-2 text-center text-xs font-medium text-primary-600 hover:bg-primary-50 disabled:opacity-50 dark:text-primary-400 dark:hover:bg-gray-700/50"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}