import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import Spinner from '../components/Spinner'
import { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage, getProfileImageUrl, getInitials, formatRelativeTime } from '../utils/format'

export default function AdminVerifications() {
  const { isAdmin } = useAuth()
  const { showToast } = useToast()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState({})
  const [rejectOpen, setRejectOpen] = useState(null)
  const [reason, setReason] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await api.get('/admin/verifications/')
        if (!cancelled) setRequests(Array.isArray(data) ? data : data.results || [])
      } catch (err) {
        showToast(getErrorMessage(err), 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const decide = async (id, action, extra = {}) => {
    const name = requests.find((r) => r.id === id)?.display_name || 'student'
    setBusy((prev) => ({ ...prev, [id]: action }))
    try {
      await api.post(`/admin/verifications/${id}/`, { action, ...extra })
      setRequests((prev) => prev.filter((r) => r.id !== id))
      if (rejectOpen === id) {
        setRejectOpen(null)
        setReason('')
      }
      showToast(
        action === 'verify'
          ? `${name} is now verified.`
          : `${name}'s verification request was rejected.`,
        'success',
      )
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    } finally {
      setBusy((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }
  }

  const startReject = (id) => {
    setRejectOpen(id)
    setReason('')
  }

  if (loading) return <Spinner />

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admins only</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          You don't have permission to view this page.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Verification Requests</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Review submitted student IDs and approve or reject them.
          </p>
        </div>
        {requests.length > 0 && (
          <span className="badge-yellow">{requests.length} pending</span>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <svg className="h-7 w-7 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-semibold text-gray-900 dark:text-white">All caught up!</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            No pending verification requests right now.
          </p>
          <Link to="/freelancers" className="btn-secondary mt-5">Browse Freelancers</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="card overflow-hidden">
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
                <div className="flex items-center gap-3 sm:w-56 sm:shrink-0 sm:flex-col sm:items-start">
                  <div className="flex items-center gap-3">
                    {req.profile_image ? (
                      <img
                        src={getProfileImageUrl(req.profile_image)}
                        alt={req.display_name}
                        className="h-11 w-11 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900 dark:text-primary-200">
                        {getInitials(req.display_name)}
                      </span>
                    )}
                    <div>
                      <Link
                        to={`/u/${req.username}`}
                        className="font-semibold text-gray-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
                      >
                        {req.display_name}
                      </Link>
                      <p className="text-xs text-gray-500">@{req.username} · {req.email}</p>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {req.school_display}
                    {req.department && ` · ${req.department}`}
                    {req.updated_at && ` · Profile updated ${formatRelativeTime(req.updated_at)}`}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">
                    Student ID Document
                  </p>
                  {req.verification_doc ? (
                    <a
                      href={getProfileImageUrl(req.verification_doc)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"
                    >
                      <img
                        src={getProfileImageUrl(req.verification_doc)}
                        alt={`Student ID for ${req.display_name}`}
                        className="max-h-48 w-full object-contain bg-gray-50 dark:bg-gray-900"
                      />
                    </a>
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
                      No document uploaded
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 flex-col gap-2 sm:w-52">
                  <button
                    type="button"
                    onClick={() => decide(req.id, 'verify')}
                    disabled={Boolean(busy[req.id])}
                    className="btn-primary disabled:opacity-60"
                  >
                    {busy[req.id] === 'verify' ? 'Verifying...' : 'Verify'}
                  </button>

                  {rejectOpen === req.id ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                      <label className="mb-1 block text-xs font-semibold text-red-700 dark:text-red-300">
                        Reject reason
                      </label>
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows="2"
                        placeholder="e.g. ID image is blurry or unreadable"
                        className="input !text-sm"
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!reason.trim()) {
                              showToast('Please enter a reason so the student knows what to fix.', 'warning')
                              return
                            }
                            decide(req.id, 'reject', { reason: reason.trim() })
                          }}
                          disabled={Boolean(busy[req.id])}
                          className="btn-primary !bg-red-600 !border-red-600 hover:!bg-red-700 disabled:opacity-60"
                        >
                          {busy[req.id] === 'reject' ? 'Rejecting...' : 'Reject'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectOpen(null)}
                          disabled={Boolean(busy[req.id])}
                          className="btn-secondary flex-1"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startReject(req.id)}
                      disabled={Boolean(busy[req.id])}
                      className="btn-secondary !border-red-300 !text-red-600 hover:!bg-red-50 disabled:opacity-60 dark:!border-red-700 dark:!text-red-400 dark:hover:!bg-red-900/30"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}