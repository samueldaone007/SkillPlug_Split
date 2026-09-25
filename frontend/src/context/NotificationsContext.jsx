import { createContext, useContext, useEffect, useCallback, useRef, useState } from 'react'
import api from '../api/client'
import { useAuth } from './AuthContext'

const NotificationsContext = createContext(null)

let sharedContext = null

function ensureContext() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (AudioContext && !sharedContext) sharedContext = new AudioContext()
    if (sharedContext && sharedContext.state === 'suspended') {
      sharedContext.resume().catch(() => {})
    }
    return sharedContext
  } catch {
    return null
  }
}

function playChime() {
  const ctx = ensureContext()
  if (!ctx) return
  try {
    const now = ctx.currentTime
    const envelope = ctx.createGain()
    envelope.gain.setValueAtTime(0, now)
    envelope.gain.linearRampToValueAtTime(0.12, now + 0.02)
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.55)
    envelope.connect(ctx.destination)

    const osc1 = ctx.createOscillator()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(880, now)
    osc1.connect(envelope)
    osc1.start(now)
    osc1.stop(now + 0.55)

    const osc2 = ctx.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1318.5, now + 0.12)
    osc2.connect(envelope)
    osc2.start(now + 0.12)
    osc2.stop(now + 0.48)
  } catch {
    // ignore audio errors
  }
}

const POLL_INTERVAL_MS = 30000

export function NotificationsProvider({ children }) {
  const { isAuthenticated, user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const prevUnreadRef = useRef(0)
  const pageRef = useRef(1)

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return null
    try {
      const [{ data: list }, { data: count }] = await Promise.all([
        api.get('/notifications/'),
        api.get('/notifications/unread-count/'),
      ])
      const isPaginated = Array.isArray(list) === false
      const items = isPaginated ? list.results : list
      const countValue = count?.count ?? (items ? items.length : 0)
      setNotifications(items || [])
      setUnread(countValue)
      setHasMore(Boolean(isPaginated && list.next))
      pageRef.current = 1
      return { items: items || [], count: countValue }
    } catch {
      return null
    }
  }, [isAuthenticated])

  const loadMore = useCallback(async () => {
    if (!isAuthenticated || loadingMore) return
    const nextPage = pageRef.current + 1
    setLoadingMore(true)
    try {
      const { data } = await api.get('/notifications/', { params: { page: nextPage } })
      const items = data.results || []
      setNotifications((prev) => {
        const merged = [...prev]
        const existing = new Set(prev.map((n) => n.id))
        for (const item of items) {
          if (!existing.has(item.id)) merged.push(item)
        }
        return merged
      })
      pageRef.current = nextPage
      setHasMore(Boolean(data.next))
    } catch {
      // keep hasMore true so the user can retry
    } finally {
      setLoadingMore(false)
    }
  }, [isAuthenticated, loadingMore])

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([])
      setUnread(0)
      setHasMore(false)
      pageRef.current = 1
      prevUnreadRef.current = 0
      return undefined
    }

    let stopped = false
    const first = async () => {
      const result = await refresh()
      if (!stopped && result) prevUnreadRef.current = result.count
    }
    first()

    const timer = setInterval(async () => {
      const result = await refresh()
      if (!result) return
      const soundAllowed = user?.notification_sound_enabled !== false
      if (soundAllowed && result.count > prevUnreadRef.current) playChime()
      prevUnreadRef.current = result.count
    }, POLL_INTERVAL_MS)

    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [isAuthenticated, refresh, user?.notification_sound_enabled])

  useEffect(() => {
    const unlock = () => ensureContext()
    window.addEventListener('pointerdown', unlock)
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  const markRead = useCallback(async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    )
    setUnread((prev) => Math.max(0, prev - 1))
    try {
      await api.post(`/notifications/${id}/read/`)
    } catch {
      refresh()
    }
  }, [refresh])

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnread(0)
    try {
      await api.post('/notifications/read-all/')
    } catch {
      refresh()
    }
  }, [refresh])

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unread,
        open,
        setOpen,
        refresh,
        loadMore,
        hasMore,
        loadingMore,
        markRead,
        markAllRead,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error('useNotifications must be used inside NotificationsProvider')
  }
  return context
}