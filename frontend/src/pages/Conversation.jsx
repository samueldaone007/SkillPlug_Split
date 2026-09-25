import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'
import { useToast } from '../components/Toast'
import Spinner from '../components/Spinner'
import { getErrorMessage, getProfileImageUrl, getInitials, formatRelativeTime } from '../utils/format'

const POLL_INTERVAL_MS = 5000
const TYPING_TIMEOUT_MS = 3000
const TYPING_SEND_THROTTLE_MS = 1600

function buildWsUrl(conversationId) {
  const token = localStorage.getItem('accessToken')
  const base =
    import.meta.env.VITE_WS_URL ||
    `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
  return `${base}/ws/conversations/${conversationId}/?token=${encodeURIComponent(token || '')}`
}

export default function Conversation() {
  const { id } = useParams()
  const { user } = useAuth()
  const { notifyNew } = useNotifications()
  const { showToast } = useToast()
  const [other, setOther] = useState(null)
  const [otherOnline, setOtherOnline] = useState(false)
  const [messages, setMessages] = useState([])
  const [readIds, setReadIds] = useState(() => new Set())
  const [hasMore, setHasMore] = useState(false)
  const [nextBefore, setNextBefore] = useState(null)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef(null)
  const bottomRef = useRef(null)
  const wsRef = useRef(null)
  const wsActiveRef = useRef(false)
  const pollTimerRef = useRef(null)
  const lastTypingSentRef = useRef(0)
  const lastScrolledIdRef = useRef(null)

  const markReadFromMessages = (incoming) => {
    const ids = incoming.filter((m) => m && m.is_read).map((m) => m.id)
    if (ids.length === 0) return
    setReadIds((prev) => {
      const next = new Set(prev)
      ids.forEach((mid) => next.add(mid))
      return next
    })
  }

  const appendUnique = (incoming) => {
    setMessages((prev) => {
      const existing = new Set(prev.map((m) => m.id))
      const toAdd = incoming.filter((m) => m && m.id && !existing.has(m.id))
      if (toAdd.length === 0) return prev
      return [...prev, ...toAdd]
    })
    markReadFromMessages(incoming)
  }

  const loadOlder = async () => {
    if (loadingOlder || !nextBefore) return
    setLoadingOlder(true)
    const el = scrollRef.current
    const prevHeight = el?.scrollHeight ?? 0
    try {
      const { data } = await api.get(`/conversations/${id}/`, {
        params: { before: nextBefore },
      })
      setMessages((prev) => {
        const existing = new Set(prev.map((m) => m.id))
        const toAdd = data.messages.filter((m) => m && m.id && !existing.has(m.id))
        if (toAdd.length === 0) return prev
        return [...toAdd, ...prev]
      })
      markReadFromMessages(data.messages)
      setNextBefore(data.next_before || null)
      setHasMore(!!data.has_more)
      if (el) {
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight - prevHeight
        })
      }
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    } finally {
      setLoadingOlder(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    setMessages([])
    setReadIds(new Set())
    setHasMore(false)
    setNextBefore(null)

    const fetchLatest = async () => {
      try {
        const { data } = await api.get(`/conversations/${id}/`)
        if (cancelled) return
        setOther(data.other)
        appendUnique(data.messages)
        setNextBefore(data.next_before || null)
        setHasMore(!!data.has_more)
      } catch (err) {
        if (!cancelled) showToast(getErrorMessage(err), 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    const poll = async () => {
      if (wsActiveRef.current) return
      await fetchLatest()
    }
    fetchLatest()
    pollTimerRef.current = setInterval(poll, POLL_INTERVAL_MS)

    const connectWs = () => {
      if (cancelled) return
      let ws
      try {
        ws = new WebSocket(buildWsUrl(id))
      } catch {
        return
      }
      wsRef.current = ws

      ws.onopen = () => {
        if (cancelled) return
        wsActiveRef.current = true
      }

      ws.onmessage = (event) => {
        let payload
        try {
          payload = JSON.parse(event.data)
        } catch {
          return
        }
        if (payload.type === 'typing') {
          if (payload.sender_id === user?.id) return
          setTypingUsers((prev) => {
            const exists = prev.some((t) => t.id === payload.sender_id)
            if (exists) return prev
            return [...prev, { id: payload.sender_id, name: payload.sender_name }]
          })
          return
        }
        if (payload.type === 'chat.read') {
          const ids = payload.message_ids || []
          if (ids.length) {
            setReadIds((prev) => {
              const next = new Set(prev)
              ids.forEach((mid) => next.add(mid))
              return next
            })
          }
          return
        }
        if (payload && payload.id) {
          appendUnique([payload])
          if (payload.sender !== user?.id) notifyNew()
        }
      }

      ws.onclose = () => {
        wsActiveRef.current = false
        if (cancelled) return
        setTimeout(connectWs, 3000)
      }

      ws.onerror = () => {
        // onclose handles reconnection fallback to polling
      }
    }
    connectWs()

    // Clear typing indicators that stop being refreshed.
    const typingCleaner = setInterval(() => {
      setTypingUsers([])
    }, TYPING_TIMEOUT_MS + 500)

    return () => {
      cancelled = true
      clearInterval(pollTimerRef.current)
      clearInterval(typingCleaner)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Auto-scroll to the bottom only when a genuinely new last message appears
  // (not when older messages are prepended).
  useEffect(() => {
    if (messages.length === 0) return
    const last = messages[messages.length - 1].id
    if (last !== lastScrolledIdRef.current) {
      lastScrolledIdRef.current = last
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    if (!other?.id) return undefined
    let cancelled = false
    const checkPresence = async () => {
      try {
        const { data } = await api.post('/conversations/presence/', { ids: [other.id] })
        if (!cancelled) setOtherOnline(Boolean(data?.presence?.[other.id]))
      } catch {
        // ignore
      }
    }
    checkPresence()
    const timer = setInterval(checkPresence, 30000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [other?.id])

  const send = async (e) => {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setSending(true)
    try {
      const { data } = await api.post(`/conversations/${id}/`, { body: text })
      appendUnique([data])
      setBody('')
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    } finally {
      setSending(false)
    }
  }

  const handleTyping = () => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    const now = Date.now()
    if (now - lastTypingSentRef.current < TYPING_SEND_THROTTLE_MS) return
    lastTypingSentRef.current = now
    ws.send(JSON.stringify({ type: 'typing' }))
  }

  if (loading) return <Spinner />

  const typingLabel =
    typingUsers.length === 0
      ? null
      : typingUsers.length === 1
        ? `${typingUsers[0].name} is typing…`
        : `${typingUsers.length} people are typing…`

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
            <div className="flex items-center gap-2">
              <Link to={`/u/${other?.username}`} className="font-semibold text-gray-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400">
                {other?.display_name}
              </Link>
              {other?.verified && (
                <span className="text-xs text-green-600 dark:text-green-400">Verified</span>
              )}
            </div>
            <p className={`flex items-center gap-1.5 text-xs ${otherOnline ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
              <span className={`h-2 w-2 rounded-full ${otherOnline ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
              {otherOnline ? 'Online now' : 'Offline'}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gray-50 p-4 dark:bg-gray-900/50">
          <div className="space-y-3">
            {hasMore && (
              <div className="flex justify-center pb-1">
                <button
                  type="button"
                  onClick={loadOlder}
                  disabled={loadingOlder}
                  className="text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50 dark:text-primary-400"
                >
                  {loadingOlder ? 'Loading…' : 'Load earlier messages'}
                </button>
              </div>
            )}

            {messages.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">
                No messages yet. Say hello!
              </p>
            ) : (
              messages.map((message) => {
                const mine = message.sender === user?.id
                const read = readIds.has(message.id)
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
                      <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? 'text-primary-200' : 'text-gray-400 dark:text-gray-500'}`}>
                        <span>{formatRelativeTime(message.created_at)}</span>
                        {mine && (
                          <span title={read ? 'Read' : 'Delivered'}>
                            {read
                              ? (
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11l3 3 4-4" />
                                </svg>
                              )
                              : (
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" opacity="0.6" />
                                </svg>
                              )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}

            {typingLabel && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-xs text-gray-400 dark:bg-gray-700 dark:text-gray-300">
                  <span className="flex gap-0.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:120ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:240ms]" />
                  </span>
                  <span className="ml-2">{typingLabel}</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Composer */}
        <form onSubmit={send} className="flex items-end gap-2 border-t border-gray-100 p-3 dark:border-gray-700">
          <textarea
            className="input min-h-[44px] flex-1 resize-none"
            rows="1"
            placeholder="Type a message..."
            value={body}
            onChange={(e) => {
              setBody(e.target.value)
              handleTyping()
            }}
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