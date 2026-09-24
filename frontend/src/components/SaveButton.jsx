import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function SaveButton({ freelancer, className = '' }) {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [saved, setSaved] = useState(Boolean(freelancer?.is_saved))
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post(`/users/${freelancer.username}/save/`)
      setSaved(data.saved)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from saved' : 'Save freelancer'}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
        saved
          ? 'bg-primary-600 text-white hover:bg-primary-700'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
      } ${className}`}
    >
      <svg className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
      {saved ? 'Saved' : 'Save'}
    </button>
  )
}