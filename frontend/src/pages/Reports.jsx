import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import Spinner from '../components/Spinner'
import { formatRelativeTime } from '../utils/format'
import { useToast } from '../components/Toast'
import { getErrorMessage } from '../utils/format'
import { usePageMeta } from '../hooks/usePageMeta'

const statusStyles = {
  pending: 'badge-yellow',
  resolved: 'badge-green',
  dismissed: 'badge-gray',
}

export default function Reports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()
  usePageMeta('My Reports - SkillPlug')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await api.get('/reports/my/')
        if (!cancelled) setReports(data.results || data)
      } catch (err) {
        showToast(getErrorMessage(err), 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) return <Spinner />

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Reports</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Track the status of your reports to moderators.
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
            <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="font-semibold text-gray-900 dark:text-white">No reports yet</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            If you see anything against our guidelines, use the Report button on a profile or job.
          </p>
          <Link to="/freelancers" className="btn-secondary mt-5">Browse Freelancers</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      report.target_type === 'job' ? 'badge-primary' : 'badge-gray'
                    }`}>
                      {report.target_type === 'job' ? 'Job' : 'Profile'}
                    </span>
                    {report.target?.url ? (
                      <Link
                        to={report.target.url}
                        className="truncate font-semibold text-gray-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
                      >
                        {report.target.title || report.target.display_name}
                      </Link>
                    ) : (
                      <span className="truncate font-semibold text-gray-900 dark:text-white">
                        Deleted content
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{report.reason}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={statusStyles[report.status] || 'badge-gray'}>
                    {report.status?.charAt(0).toUpperCase() + report.status?.slice(1)}
                  </span>
                  <span className="text-xs text-gray-400">{formatRelativeTime(report.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}