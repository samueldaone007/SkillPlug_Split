import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import Spinner from '../components/Spinner'
import { getErrorMessage, getProfileImageUrl, getInitials, formatRelativeTime } from '../utils/format'

const POLL_INTERVAL_MS = 5000

export default function Conversation() {
  const { id } = useParams()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [other, setOther] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const messagesRef = useRef([])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    let cancelled = false
    let timer
    const load = async () => {
      try {
        const { data } = await api.get(`/conversations/${id}/`)
        if (cancelled) return
        setOther(data.other)
        setMessages(data.messages)
      } catch (err) {
        if (!cancelled) showToast(getErrorMessage(err), 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    timer = setInterval(load, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const send = async (e) => {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setSending(true)
    try {
      const { data } = await api.post(`/conversations/${id}/`, { body: text })
      setMessages((prev) => [...prev, data])
      setBody('')
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/messages" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        All conversations
      </Link>

      <div className="flex h-[calc(100vh-220px)] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-700">
          {other?.profile_image ? (
            <img
              src={getProfileImageUrl(other.profile_image)}
              alt={other.display_name}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900 dark:text-primary-200">
              {getInitials(other?.display_name)}
            </span>
          )}
          <div>
            <Link to={`/u/${other?.username}`} className="font-semibold text-gray-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400">
              {other?.display_name}
            </Link>
            {other?.verified && (
              <span className="ml-1 text-xs text-green-600 dark:text-green-400">Verified</span>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4 dark:bg-gray-900/50">
          {messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">
              No messages yet. Say hello!
            </p>
          ) : (
            messages.map((message) => {
              const mine = message.sender === user?.id
              return (
                <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      mine
                        ? 'rounded-br-sm bg-primary-600 text-white'
                        : 'rounded-bl-sm bg-white text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm">{message.body}</p>
                    <p className={`mt-1 text-[10px] ${mine ? 'text-primary-200' : 'text-gray-400 dark:text-gray-500'}`}>
                      {formatRelativeTime(message.created_at)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <form onSubmit={send} className="flex items-end gap-2 border-t border-gray-100 p-3 dark:border-gray-700">
          <textarea
            className="input min-h-[44px] flex-1 resize-none"
            rows="1"
            placeholder="Type a message..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(e)
              }
            }}
          />
          <button type="submit" className="btn-primary !px-4" disabled={sending || !body.trim()}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span className="sr-only">Send</span>
          </button>
        </form>
      </div>
    </div>
  )
}