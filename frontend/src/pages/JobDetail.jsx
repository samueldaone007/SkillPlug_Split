import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import Spinner from '../components/Spinner'
import StarRating from '../components/StarRating'
import ReportButton from '../components/ReportButton'
import { getErrorMessage, getProfileImageUrl, getInitials, formatRelativeTime, formatNaira } from '../utils/format'

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [job, setJob] = useState(null)
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [applyForm, setApplyForm] = useState({ message: '', proposed_budget: '' })
  const [applying, setApplying] = useState(false)
  const [hasApplied, setHasApplied] = useState(false)

  const loadJob = async () => {
    const { data } = await api.get(`/jobs/${id}/`)
    setJob(data)
    setHasApplied(data.has_applied)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const load = async () => {
      try {
        await loadJob()
        if (cancelled) return
        const appsRes = await api.get(`/jobs/${id}/applications/`).catch(() => null)
        if (!cancelled && appsRes) setApplications(appsRes.data.results || appsRes.data)
      } catch (err) {
        showToast(getErrorMessage(err), 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleApply = async (e) => {
    e.preventDefault()
    setApplying(true)
    try {
      await api.post(`/jobs/${id}/apply/`, applyForm)
      showToast('Application submitted successfully!', 'success')
      await loadJob()
      setApplyForm({ message: '', proposed_budget: '' })
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    } finally {
      setApplying(false)
    }
  }

  const updateAppStatus = async (appId, status) => {
    try {
      await api.post(`/jobs/${appId}/status/${status}/`)
      showToast(`Application ${status}.`, 'success')
      const appsRes = await api.get(`/jobs/${id}/applications/`).catch(() => null)
      if (appsRes) setApplications(appsRes.data.results || appsRes.data)
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    }
  }

  const updateJobStatus = async (newStatus) => {
    try {
      await api.patch(`/jobs/${id}/`, { status: newStatus })
      showToast('Job status updated!', 'success')
      await loadJob()
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    }
  }

  const deleteJob = async () => {
    if (!window.confirm('Are you sure you want to delete this job?')) return
    try {
      await api.delete(`/jobs/${id}/`)
      showToast('Job deleted successfully!', 'success')
      navigate('/jobs')
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    }
  }

  if (loading) return <Spinner />
  if (!job) return <div className="py-16 text-center text-gray-500">Job not found.</div>

  const isOwner = user && job.posted_by?.username === user.username
  const statusColors = {
    open: 'badge-green',
    in_progress: 'badge-yellow',
    completed: 'badge-primary',
    closed: 'badge-gray',
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="card overflow-hidden">
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className={statusColors[job.status] || 'badge-gray'}>
                  {job.status?.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </span>
                {job.application_count > 0 && (
                  <span className="badge-gray">{job.application_count} applications</span>
                )}
              </div>
              <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{job.title}</h1>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-primary-600 dark:text-primary-400">
                {job.budget_string || 'Negotiable'}
              </p>
              {job.created_at && (
                <p className="text-xs text-gray-400">Posted {formatRelativeTime(job.created_at)}</p>
              )}
            </div>
          </div>

          {/* Posted by */}
          <Link to={`/u/${job.posted_by?.username}`} className="mt-4 flex items-center gap-3">
            {job.posted_by?.profile_image ? (
              <img src={getProfileImageUrl(job.posted_by.profile_image)} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900 dark:text-primary-200">
                {getInitials(job.posted_by?.display_name)}
              </span>
            )}
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{job.posted_by?.display_name}</p>
              {job.location_preference && (
                <p className="text-xs text-gray-500">{job.location_preference}</p>
              )}
            </div>
          </Link>

          {/* Skills */}
          {job.required_skills?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {job.required_skills.map((skill) => (
                <Link key={skill.id} to={`/jobs?skill=${encodeURIComponent(skill.name)}`} className="badge badge-primary px-2.5 py-1 hover:bg-primary-200 dark:hover:bg-primary-800">
                  {skill.name}
                </Link>
              ))}
            </div>
          )}

          {/* Description */}
          <div className="mt-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400">Job Description</h2>
            <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{job.description}</p>
          </div>

          {/* Budget details */}
          {(job.budget_min || job.budget_max) && (
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {job.budget_min && (
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Minimum</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{formatNaira(job.budget_min)}</p>
                </div>
              )}
              {job.budget_max && (
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Maximum</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{formatNaira(job.budget_max)}</p>
                </div>
              )}
            </div>
          )}

          {/* Contact info (if visible) */}
          {(job.contact_email || job.contact_whatsapp) && (
            <div className="mt-6 flex flex-wrap gap-3">
              {job.contact_email && (
                <a href={`mailto:${job.contact_email}`} className="btn-secondary">
                  <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email
                </a>
              )}
              {job.contact_whatsapp && (
                <a
                  href={`https://wa.me/${job.contact_whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary !bg-green-600 hover:!bg-green-700"
                >
                  WhatsApp
                </a>
              )}
            </div>
          )}

          {/* Owner actions */}
          {isOwner && (
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-5 dark:border-gray-700">
              <select
                className="input !w-auto"
                value={job.status}
                onChange={(e) => updateJobStatus(e.target.value)}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="closed">Closed</option>
              </select>
              <Link to={`/jobs/${job.id}/edit`} className="btn-secondary">Edit Job</Link>
              <button type="button" onClick={deleteJob} className="btn-danger">Delete Job</button>
            </div>
          )}

          {/* Application form */}
          {user && !isOwner && job.status === 'open' && !hasApplied && user.is_student && (
            <div className="mt-6 border-t border-gray-100 pt-5 dark:border-gray-700">
              <h2 className="mb-3 font-semibold text-gray-900 dark:text-white">Apply for this job</h2>
              <form onSubmit={handleApply} className="space-y-3">
                <textarea
                  className="input"
                  rows="4"
                  required
                  placeholder="Explain why you're a good fit for this job..."
                  value={applyForm.message}
                  onChange={(e) => setApplyForm({ ...applyForm, message: e.target.value })}
                />
                <input
                  className="input"
                  type="number"
                  placeholder="Proposed budget in ₦ (optional)"
                  value={applyForm.proposed_budget}
                  onChange={(e) => setApplyForm({ ...applyForm, proposed_budget: e.target.value })}
                />
                <button type="submit" className="btn-primary" disabled={applying}>
                  {applying ? 'Submitting...' : 'Submit Application'}
                </button>
              </form>
            </div>
          )}

          {hasApplied && (
            <div className="mt-6 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-700 dark:bg-green-900 dark:text-green-200">
              You have applied for this job.
            </div>
          )}

          {user && !user.is_student && job.status === 'open' && !isOwner && (
            <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
              Log in as a student to apply for this job.
            </div>
          )}

          {/* Report */}
          {user && !isOwner && (
            <div className="mt-6 flex items-center justify-end border-t border-gray-100 pt-4 dark:border-gray-700">
              <ReportButton targetType="job" targetId={job.id} />
            </div>
          )}
        </div>
      </div>

      {/* Applications (owner view) */}
      {isOwner && applications.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Applications ({applications.length})</h2>
          <div className="space-y-3">
            {applications.map((app) => (
              <div key={app.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <Link to={`/u/${app.student?.username}`} className="flex items-center gap-3">
                    {app.student?.profile_image ? (
                      <img src={getProfileImageUrl(app.student.profile_image)} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900 dark:text-primary-200">
                        {getInitials(app.student?.display_name)}
                      </span>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{app.student?.display_name}</p>
                      {app.student?.school_display && (
                        <p className="text-xs text-gray-500">{app.student.school_display}</p>
                      )}
                    </div>
                  </Link>
                  <span className={
                    app.status === 'accepted' ? 'badge-green' :
                    app.status === 'rejected' ? 'badge-red' : 'badge-yellow'
                  }>
                    {app.status?.charAt(0).toUpperCase() + app.status?.slice(1)}
                  </span>
                </div>
                {app.message && (
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{app.message}</p>
                )}
                {app.proposed_budget && (
                  <p className="mt-2 text-sm font-semibold text-primary-600 dark:text-primary-400">
                    Proposed: {formatNaira(app.proposed_budget)}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-400">Applied {formatRelativeTime(app.created_at)}</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => updateAppStatus(app.id, 'accepted')} className="btn-primary text-xs !py-1.5">
                    Accept
                  </button>
                  <button type="button" onClick={() => updateAppStatus(app.id, 'rejected')} className="btn-danger text-xs !py-1.5">
                    Reject
                  </button>
                  <button type="button" onClick={() => updateAppStatus(app.id, 'pending')} className="btn-secondary text-xs !py-1.5">
                    Mark Pending
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}