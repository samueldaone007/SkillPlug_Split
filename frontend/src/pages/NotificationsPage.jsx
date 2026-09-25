import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useNotifications } from '../context/NotificationsContext'
import { useToast } from '../components/Toast'
import Spinner from '../components/Spinner'
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

export default function NotificationsPage() {
  const { notifications, unread, refresh, markRead, markAllRead, loadMore, hasMore, loadingMore } = useNotifications()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    refresh().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [refresh])

  const handleItemClick = async (n) => {
    if (!n.is_read) {
      try {
        await markRead(n.id)
      } catch {
        showToast('Could not mark as read. Refresh the page and try again.', 'error')
      }
    }
    if (n.link) navigate(n.link)
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllRead()
      showToast('All notifications marked as read.', 'success')
    } catch {
      showToast('Could not mark notifications as read. Try again.', 'error')
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {unread > 0 ? `${unread} unread` : 'You are all caught up'}
          </p>
        </div>
        {unread > 0 && (
          <button type="button" onClick={handleMarkAllRead} className="btn-secondary">
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet.</p>
          <Link
            to="/freelancers"
            className="mt-4 inline-block text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            Explore freelancers
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {notifications.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => handleItemClick(n)}
                  className={`flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    n.is_read ? '' : 'bg-primary-50/50 dark:bg-primary-900/10'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${TYPE_COLORS[n.notification_type] || TYPE_COLORS.system}`}
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

          {hasMore && (
            <div className="border-t border-gray-100 p-3 dark:border-gray-700">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full rounded-lg py-2 text-center text-sm font-medium text-primary-600 hover:bg-primary-50 disabled:opacity-50 dark:text-primary-400 dark:hover:bg-gray-700/50"
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