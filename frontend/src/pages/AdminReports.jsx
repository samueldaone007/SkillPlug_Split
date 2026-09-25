import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import Spinner from '../components/Spinner'
import { getErrorMessage, formatRelativeTime } from '../utils/format'

const STATUSES = ['pending', 'resolved', 'dismissed']

const STATUS_BADGES = {
  pending: 'badge-yellow',
  resolved: 'badge-green',
  dismissed: 'badge-gray',
}

export default function AdminReports() {
  const { isAdmin } = useAuth()
  const { showToast } = useToast()
  const [status, setStatus] = useState('pending')
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState({})

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const load = async () => {
      try {
        const { data } = await api.get('/admin/reports/', { params: { status } })
        if (!cancelled) setReports(Array.isArray(data) ? data : data.results || [])
      } catch (err) {
        showToast(getErrorMessage(err), 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const decide = async (id, action) => {
    setBusy((prev) => ({ ...prev, [id]: action }))
    try {
      await api.post(`/admin/reports/${id}/action/`, { action })
      setReports((prev) => prev.filter((r) => r.id !== id))
      showToast(action === 'resolve' ? 'Report resolved and action taken.' : 'Report dismissed.', 'success')
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

  if (loading) return <Spinner />

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admins only</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">You don't have permission to view this page.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports & Moderation</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Review user reports and take action on profiles or jobs that break the rules.
        </p>
      </div>

      <div className="mb-6 flex gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              status === s
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {reports.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <svg className="h-7 w-7 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-semibold text-gray-900 dark:text-white">Nothing here</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {status === 'pending' ? 'No pending reports right now.' : `No ${status} reports.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={STATUS_BADGES[report.status] || 'badge-gray'}>
                      {report.status}
                    </span>
                    <span className="badge-gray">{report.target_type}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{report.reason}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Reported by <span className="font-medium">{report.reporter_name}</span> · {formatRelativeTime(report.created_at)}
                  </p>
                </div>
                <Link to={report.target?.url} className="btn-secondary text-xs !py-1.5">
                  View {report.target_type}
                </Link>
              </div>

              {status === 'pending' && (
                <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => decide(report.id, 'resolve')}
                    disabled={Boolean(busy[report.id])}
                    className="btn-primary text-xs !py-1.5 disabled:opacity-60"
                  >
                    {busy[report.id] === 'resolve' ? 'Resolving...' : 'Resolve & take action'}
                  </button>
                  <button
                    type="button"
                    onClick={() => decide(report.id, 'dismiss')}
                    disabled={Boolean(busy[report.id])}
                    className="btn-secondary text-xs !py-1.5 disabled:opacity-60"
                  >
                    {busy[report.id] === 'dismiss' ? 'Dismissing...' : 'Dismiss'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}