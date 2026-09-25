import { useEffect, useState, useCallback } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

const POLL_INTERVAL_MS = 30000

export function useUnreadMessages() {
  const { isAuthenticated } = useAuth()
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setCount(0)
      return
    }
    try {
      const { data } = await api.get('/conversations/unread-count/')
      setCount(data?.count ?? 0)
    } catch {
      // keep the last known count
    }
  }, [isAuthenticated])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, POLL_INTERVAL_MS)
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh])

  return count
}