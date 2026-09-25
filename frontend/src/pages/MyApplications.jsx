import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import Spinner from '../components/Spinner'
import { formatRelativeTime, formatNaira } from '../utils/format'
import { useToast } from '../components/Toast'
import { getErrorMessage } from '../utils/format'

export default function MyApplications() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [respondOpen, setRespondOpen] = useState(null)
  const [respondForm, setRespondForm] = useState({ accepted: true, message: '', proposed_budget: '' })
  const [submitting, setSubmitting] = useState(false)
  const { showToast } = useToast()
  const navigate = useNavigate()

  const startChat = async (app) => {
    if (!app.job?.posted_by?.username) return
    try {
      const { data } = await api.post(`/conversations/start/${app.job.posted_by.username}/`)
      navigate(`/messages/${data.id}`)
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    }
  }

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

  const respond = async (app, acceptedOverride = null) => {
    const accepted = acceptedOverride ?? respondForm.accepted
    setSubmitting(true)
    try {
      await api.post(`/jobs/${app.job?.id}/invitations/${app.id}/respond/`, { ...respondForm, accepted })
      showToast(accepted ? 'Invitation accepted!' : 'Invitation declined.', 'success')
      setRespondOpen(null)
      const { data } = await api.get('/jobs/my-applications/')
      setApplications(data.results || data)
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const statusColors = {
    pending: 'badge-yellow',
    accepted: 'badge-green',
    rejected: 'badge-red',
    invited: 'badge-primary',
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
              {app.status === 'accepted' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {app.job?.posted_by?.username && (
                    <button
                      type="button"
                      className="btn-primary text-xs !py-1.5"
                      onClick={() => startChat(app)}
                    >
                      <svg className="mr-1 inline h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      Message {app.job?.posted_by?.display_name?.split(' ')[0] || 'Employer'}
                    </button>
                  )}
                  {app.job?.contact_whatsapp && (
                    <a
                      href={`https://wa.me/${app.job.contact_whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary text-xs !py-1.5 !bg-green-600 hover:!bg-green-700"
                    >
                      Contact Employer on WhatsApp
                    </a>
                  )}
                </div>
              )}
              {app.status === 'invited' && (
                <div className="mt-3 rounded-xl bg-primary-50 p-3 dark:bg-primary-900/20">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    You've been invited to apply! Would you like to accept?
                  </p>
                  {respondOpen === app.id ? (
                    <div className="mt-3 space-y-3">
                      <textarea
                        className="input"
                        rows="2"
                        placeholder="Message to the employer (optional)"
                        value={respondForm.message}
                        onChange={(e) => setRespondForm((p) => ({ ...p, message: e.target.value }))}
                      />
                      <input
                        className="input"
                        type="number"
                        min="0"
                        placeholder="Proposed budget (optional)"
                        value={respondForm.proposed_budget}
                        onChange={(e) => setRespondForm((p) => ({ ...p, proposed_budget: e.target.value }))}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn-primary text-xs !py-1.5"
                          disabled={submitting}
                          onClick={() => respond(app)}
                        >
                          {submitting ? 'Submitting...' : 'Confirm Application'}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary text-xs !py-1.5"
                          disabled={submitting}
                          onClick={() => respond(app, false)}
                        >
                          Decline
                        </button>
                        <button
                          type="button"
                          className="btn-secondary text-xs !py-1.5"
                          onClick={() => setRespondOpen(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        className="btn-primary text-xs !py-1.5"
                        onClick={() => { setRespondForm({ accepted: true, message: '', proposed_budget: '' }); setRespondOpen(app.id) }}
                      >
                        Accept Invitation
                      </button>
                      <button
                        type="button"
                        className="btn-secondary text-xs !py-1.5"
                        onClick={() => respond(app, false)}
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}