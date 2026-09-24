import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import Spinner from '../components/Spinner'
import { formatRelativeTime } from '../utils/format'
import { useToast } from '../components/Toast'
import { getErrorMessage } from '../utils/format'

export default function MyJobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await api.get('/jobs/my-jobs/')
        if (!cancelled) setJobs(data.results || data)
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
    open: 'badge-green',
    in_progress: 'badge-yellow',
    completed: 'badge-primary',
    closed: 'badge-gray',
  }

  if (loading) return <Spinner />

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Job Posts</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your job postings and applications.
          </p>
        </div>
        <Link to="/jobs/post" className="btn-primary">Post a Job</Link>
      </div>

      {jobs.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-gray-500 dark:text-gray-400">You haven't posted any jobs yet.</p>
          <Link to="/jobs/post" className="btn-primary mt-4">Post a Job</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Link to={`/jobs/${job.id}`} className="flex-1">
                  <h3 className="font-semibold text-gray-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400">
                    {job.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {job.application_count} {job.application_count === 1 ? 'application' : 'applications'} · {formatRelativeTime(job.created_at)}
                  </p>
                </Link>
                <div className="flex items-center gap-2">
                  <span className={statusColors[job.status] || 'badge-gray'}>
                    {job.status?.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </span>
                  <Link to={`/jobs/${job.id}/edit`} className="btn-secondary text-xs !py-1.5">
                    Edit
                  </Link>
                </div>
              </div>
              {job.description && (
                <p className="mt-2 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{job.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}