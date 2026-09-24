import { Link } from 'react-router-dom'
import { formatRelativeTime } from '../utils/format'

export default function JobCard({ job }) {
  if (!job) return null

  const statusColors = {
    open: 'badge-green',
    in_progress: 'badge-yellow',
    completed: 'badge-primary',
    closed: 'badge-gray',
  }

  return (
    <div className="card animate-fade-in overflow-hidden transition-shadow hover:shadow-lg">
      <div className="p-5">
        <div className="mb-2 flex items-start justify-between gap-3">
          <Link to={`/jobs/${job.id}`} className="flex-1">
            <h3 className="font-semibold text-gray-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400">
              {job.title}
            </h3>
          </Link>
          <span className={statusColors[job.status] || 'badge-gray'}>
            {job.status?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </span>
        </div>

        <div className="mb-3 flex items-center gap-4 text-sm">
          <span className="inline-flex items-center text-gray-600 dark:text-gray-300">
            <svg className="mr-1 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2zm6 6.5c0 1.933-2.686 3.5-6 3.5s-6-1.567-6-3.5c0-.831.348-1.592.91-2.18.09.03.185.05.283.05.768 0 1.456-.354 1.9-.91a3.5 3.5 0 01.907-.027A5.999 5.999 0 006 12.5c0 .184.021.364.058.54A2.653 2.653 0 004.5 10.5a2.66 2.66 0 00-.5.052A1.999 1.999 0 005 9.5c.34 0 .656.08.941.232A6.996 6.996 0 012.998 8.5a7 7 0 1114 0c0 .72-.116 1.413-.316 2.064z" />
            </svg>
            {job.posted_by?.display_name}
          </span>
          <span className="inline-flex items-center text-gray-600 dark:text-gray-300">
            <svg className="mr-1 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatRelativeTime(job.created_at)}
          </span>
        </div>

        <Link to={`/jobs/${job.id}`}>
          <p className="mb-3 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
            {job.description}
          </p>
        </Link>

        {job.required_skills?.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {job.required_skills.slice(0, 4).map((skill) => (
              <span key={skill.id} className="badge-gray">
                {skill.name}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
          <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
            {job.budget_string || 'Negotiable'}
          </span>
          <div className="flex items-center gap-3">
            {typeof job.application_count !== 'undefined' && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {job.application_count} {job.application_count === 1 ? 'application' : 'applications'}
              </span>
            )}
            <Link to={`/jobs/${job.id}`} className="rounded-lg border border-primary-200 px-3 py-1.5 text-sm font-semibold text-primary-600 hover:bg-primary-50 dark:border-primary-800 dark:text-primary-400 dark:hover:bg-primary-900/50">
              View
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}