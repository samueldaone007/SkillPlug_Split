import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import Spinner from '../components/Spinner'
import { getErrorMessage, getProfileImageUrl, getInitials, formatRelativeTime } from '../utils/format'

export default function Messages() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await api.get('/conversations/')
        if (!cancelled) setConversations(Array.isArray(data) ? data : data.results || [])
      } catch (err) {
        showToast(getErrorMessage(err), 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return <Spinner />

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Messages</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Chat with clients and freelancers, all in one place.
        </p>
      </div>

      {conversations.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
            <svg className="h-7 w-7 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <p className="font-semibold text-gray-900 dark:text-white">No conversations yet</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Message a freelancer or client from their profile to start chatting.
          </p>
          <Link to="/freelancers" className="btn-secondary mt-5">Browse Freelancers</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map((conversation) => {
            const other = conversation.other
            const isMeLast = conversation.last_message?.sender === user?.id
            return (
              <Link
                key={conversation.id}
                to={`/messages/${conversation.id}`}
                className="card flex items-center gap-4 p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                {other?.profile_image ? (
                  <img
                    src={getProfileImageUrl(other.profile_image)}
                    alt={other.display_name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900 dark:text-primary-200">
                    {getInitials(other?.display_name)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold text-gray-900 dark:text-white">{other?.display_name}</p>
                    {conversation.last_message?.created_at && (
                      <span className="shrink-0 text-xs text-gray-400">
                        {formatRelativeTime(conversation.last_message.created_at)}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                      {conversation.last_message ? (
                        <>{isMeLast && 'You: '}{conversation.last_message.body}</>
                      ) : (
                        'Start a conversation'
                      )}
                    </p>
                    {conversation.unread_count > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary-600 px-1.5 text-xs font-bold text-white">
                        {conversation.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}