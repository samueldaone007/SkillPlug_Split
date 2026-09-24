import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import Spinner from '../components/Spinner'
import { formatRelativeTime, formatNaira } from '../utils/format'
import { useToast } from '../components/Toast'
import { getErrorMessage } from '../utils/format'

export default function MyApplications() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await api.get('/jobs/my-applications/')
        if (!cancelled) setApplications(data.results || data)
      } catch (err) {
        showToast(getErrorMessage(err), 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const statusColors = {
    pending: 'badge-yellow',
    accepted: 'badge-green',
    rejected: 'badge-red',
  }

  if (loading) return <Spinner />

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Applications</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Track the jobs you've applied to.
        </p>
      </div>

      {applications.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-gray-500 dark:text-gray-400">You haven't applied to any jobs yet.</p>
          <Link to="/jobs" className="btn-primary mt-4">Browse Jobs</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div key={app.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link to={`/jobs/${app.job?.id}`} className="font-semibold text-gray-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400">
                    {app.job?.title}
                  </Link>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Applied {formatRelativeTime(app.created_at)} · {app.job?.budget_string || 'Negotiable'}
                  </p>
                </div>
                <span className={statusColors[app.status] || 'badge-gray'}>
                  {app.status?.charAt(0).toUpperCase() + app.status?.slice(1)}
                </span>
              </div>
              {app.message && (
                <p className="mt-3 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{app.message}</p>
              )}
              {app.proposed_budget && (
                <p className="mt-2 text-sm font-semibold text-primary-600 dark:text-primary-400">
                  Proposed budget: {formatNaira(app.proposed_budget)}
                </p>
              )}
              {app.status === 'accepted' && app.job?.contact_whatsapp && (
                <a
                  href={`https://wa.me/${app.job.contact_whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary mt-3 !bg-green-600 hover:!bg-green-700 text-xs"
                >
                  Contact Employer on WhatsApp
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}