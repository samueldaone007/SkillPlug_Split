import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import Spinner from '../components/Spinner'
import { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../utils/format'

const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  completed: 'Completed',
  closed: 'Closed',
}

const STATUS_COLORS = {
  open: 'bg-green-500',
  in_progress: 'bg-blue-500',
  completed: 'bg-gray-400',
  closed: 'bg-red-500',
}

function MiniBarChart({ data, color }) {
  const max = Math.max(...data.map((d) => d.count), 1)
  const peak = data.reduce((best, d) => (d.count > best.count ? d : best), data[0] || {})
  return (
    <div>
      <div className="flex h-36 items-end gap-[3px]">
        {data.map((d) => {
          const h = Math.max(Math.round((d.count / max) * 100), 2)
          return (
            <div
              key={d.date}
              className="group relative flex flex-1 items-end"
              title={`${d.date}: ${d.count}`}
            >
              <div className={`w-full rounded-t ${color}`} style={{ height: `${h}px` }} />
              <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-1.5 py-0.5 text-[10px] text-white group-hover:block dark:bg-gray-600">
                {d.count}
              </span>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-gray-400">
        Peak: {peak.count} on {peak.date?.slice(5) || '—'}
      </p>
    </div>
  )
}

export default function AdminOverview() {
  const { isAdmin } = useAuth()
  const { showToast } = useToast()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [skills, setSkills] = useState([])
  const [skillsLoading, setSkillsLoading] = useState(true)
  const [skillForm, setSkillForm] = useState({ name: '', icon: '' })
  const [addingSkill, setAddingSkill] = useState(false)
  const [jobs, setJobs] = useState([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [jobsPage, setJobsPage] = useState(null)
  const [togglingJob, setTogglingJob] = useState(null)
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [userSearch, setUserSearch] = useState('')
  const [suspendTarget, setSuspendTarget] = useState(null)
  const [archiving, setArchiving] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await api.get('/admin/stats/')
        if (!cancelled) setStats(data)
      } catch (err) {
        showToast(getErrorMessage(err), 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    const loadSkills = async () => {
      try {
        const { data } = await api.get('/skills/')
        if (!cancelled) setSkills(data)
      } catch (err) {
        showToast(getErrorMessage(err), 'error')
      } finally {
        if (!cancelled) setSkillsLoading(false)
      }
    }
    loadSkills()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    const loadJobs = async () => {
      try {
        const { data } = await api.get('/admin/jobs/')
        if (!cancelled) {
          setJobs(data.results || data)
          setJobsPage(data.next || null)
        }
      } catch (err) {
        showToast(getErrorMessage(err), 'error')
      } finally {
        if (!cancelled) setJobsLoading(false)
      }
    }
    loadJobs()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    setUsersLoading(true)
    const loadUsers = async () => {
      try {
        const { data } = await api.get('/admin/users/', {
          params: userSearch ? { search: userSearch } : {},
        })
        if (!cancelled) setUsers(data)
      } catch (err) {
        showToast(getErrorMessage(err), 'error')
      } finally {
        if (!cancelled) setUsersLoading(false)
      }
    }
    const debounce = setTimeout(loadUsers, userSearch ? 300 : 0)
    return () => {
      cancelled = true
      clearTimeout(debounce)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSearch])

  const handleAddSkill = async (e) => {
    e.preventDefault()
    const name = skillForm.name.trim()
    if (!name) return
    setAddingSkill(true)
    try {
      const { data } = await api.post('/skills/create/', {
        name,
        icon: skillForm.icon.trim(),
      })
      setSkills((prev) => [...prev, data])
      setSkillForm({ name: '', icon: '' })
      setStats((prev) => (prev ? { ...prev, skills_count: (prev.skills_count || 0) + 1 } : prev))
      showToast(`Skill "${name}" added.`, 'success')
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    } finally {
      setAddingSkill(false)
    }
  }

  const handleDeleteSkill = async (skill) => {
    try {
      await api.delete(`/skills/${skill.id}/`)
      setSkills((prev) => prev.filter((s) => s.id !== skill.id))
      setStats((prev) => (prev ? { ...prev, skills_count: Math.max(0, (prev.skills_count || 0) - 1) } : prev))
      showToast(`Skill "${skill.name}" removed.`, 'success')
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    }
  }

  const archiveStale = async () => {
    if (!window.confirm('Archive open jobs with no activity for 90+ days? This cannot be undone.')) return
    setArchiving(true)
    try {
      const { data } = await api.post('/admin/jobs/archive-stale/')
      showToast(
        data.archived > 0
          ? `${data.archived} dormant job${data.archived === 1 ? '' : 's'} archived.`
          : 'No dormant jobs found.',
        'success'
      )
      if (data.archived > 0) {
        const { data: freshStats } = await api.get('/admin/stats/')
        setStats(freshStats)
        const { data: freshJobs } = await api.get('/admin/jobs/')
        setJobs(freshJobs.results || freshJobs)
        setJobsPage(freshJobs.next || null)
      }
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    } finally {
      setArchiving(false)
    }
  }

  const loadMoreJobs = async () => {
    if (!jobsPage) return
    try {
      const { data } = await api.get(jobsPage.replace(import.meta.env.VITE_API_URL || '/api/v1', ''))
      setJobs((prev) => [...prev, ...(data.results || data)])
      setJobsPage(data.next || null)
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    }
  }

  const toggleJob = async (id) => {
    setTogglingJob(id)
    try {
      const { data } = await api.post(`/admin/jobs/${id}/toggle/`)
      setJobs((prev) => prev.map((j) => (j.id === id ? data : j)))
      showToast(data.is_active ? 'Job is live on the board.' : 'Job hidden from the board.', 'success')
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    } finally {
      setTogglingJob(null)
    }
  }

  const applyUserAction = async (id, action) => {
    setSuspendTarget(id)
    try {
      const { data } = await api.post(`/admin/users/${id}/action/`, { action })
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, is_suspended: data.is_suspended } : u)))
      showToast(data.is_suspended ? 'Account suspended.' : 'Account reactivated.', action === 'suspend' ? 'success' : 'success')
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    } finally {
      setSuspendTarget(null)
    }
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

  const cards = stats
    ? [
        { label: 'Total Users', value: stats.total_users, tile: 'bg-primary-100 text-primary-600 dark:bg-primary-900/30', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
        { label: 'Students', value: stats.students, tile: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
        { label: 'Clients', value: stats.clients, tile: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
        { label: 'New (7 days)', value: stats.recent_signups_7d, tile: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
        { label: 'Verified Students', value: stats.verified_students, tile: 'bg-green-100 text-green-600 dark:bg-green-900/30', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
        { label: 'Open Jobs', value: stats.open_jobs, tile: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
        { label: 'Skills', value: stats.skills_count, tile: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
        { label: 'Applications', value: stats.total_applications, tile: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
      ]
    : []

  const jobTotal = stats
    ? Object.values(stats.jobs_by_status || {}).reduce((a, b) => a + (Number(b) || 0), 0)
    : 0

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Overview</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            A snapshot of everything happening on SkillPlug.
          </p>
        </div>
        <Link
          to="/admin/verifications"
          className="inline-flex items-center rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          Review Verifications
          {stats?.pending_verifications > 0 && (
            <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold">
              {stats.pending_verifications}
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={archiveStale}
          disabled={archiving}
          className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {archiving ? 'Archiving…' : 'Archive Stale Jobs'}
        </button>
      </div>

      {!stats ? (
        <div className="card p-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">No data available.</p>
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {cards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${card.tile}`}>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                  </svg>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Pending verifications + reviews */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Platform Health
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Pending Verifications</span>
                  <Link
                    to="/admin/verifications"
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      stats.pending_verifications > 0
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    }`}
                  >
                    {stats.pending_verifications}
                  </Link>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Pending Applications</span>
                  <span className="px-3 py-1 rounded-full bg-yellow-100 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                    {stats.pending_applications}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Reviews</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{stats.total_reviews}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Average Rating</span>
                  <span className="flex items-center text-sm font-semibold text-gray-900 dark:text-white">
                    {stats.avg_rating || '—'}
                    {stats.avg_rating > 0 && (
                      <svg className="ml-1 h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.034a1 1 0 00-1.176 0l-3.976 2.888c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Jobs by status */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Jobs by Status
              </h2>
              <div className="space-y-3">
                {(stats.jobs_by_status ? Object.keys(stats.jobs_by_status) : []).map((key) => {
                  const value = Number(stats.jobs_by_status[key]) || 0
                  const pct = jobTotal > 0 ? Math.round((value / jobTotal) * 100) : 0
                  return (
                    <div key={key}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{STATUS_LABELS[key] || key}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{value}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                        <div
                          className={`h-full rounded-full ${STATUS_COLORS[key] || 'bg-gray-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
                {jobTotal === 0 && (
                  <p className="text-sm text-gray-400">No jobs posted yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Growth charts (30 days) */}
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                New Signups
              </h2>
              <p className="mb-4 text-xs text-gray-400 dark:text-gray-500">Last 30 days</p>
              {stats.signups_last_30d?.length ? (
                <MiniBarChart data={stats.signups_last_30d} color="bg-emerald-500" />
              ) : (
                <p className="py-8 text-center text-sm text-gray-400">No data yet.</p>
              )}
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Job Applications
              </h2>
              <p className="mb-4 text-xs text-gray-400 dark:text-gray-500">Last 30 days</p>
              {stats.applications_last_30d?.length ? (
                <MiniBarChart data={stats.applications_last_30d} color="bg-primary-500" />
              ) : (
                <p className="py-8 text-center text-sm text-gray-400">No data yet.</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Moderation */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Job moderation */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Job Moderation
          </h2>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Hide or unhide jobs on the public board.
          </p>

          <div className="mt-4 max-h-96 overflow-y-auto pr-1">
            {jobsLoading ? (
              <div className="py-8"><Spinner /></div>
            ) : jobs.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">No jobs yet.</p>
            ) : (
              <ul className="space-y-2">
                {jobs.map((job) => (
                  <li
                    key={job.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900/40"
                  >
                    <div className="min-w-0">
                      <Link
                        to={`/jobs/${job.id}`}
                        className="block truncate text-sm font-medium text-gray-800 hover:text-primary-600 dark:text-gray-200"
                      >
                        {job.title}
                      </Link>
                      <p className="truncate text-xs text-gray-400">
                        {job.posted_by?.display_name} · {job.application_count} applications
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_LABELS[job.status] ? '' : ''} ${
                        job.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {job.is_active ? 'Live' : 'Hidden'}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleJob(job.id)}
                        disabled={togglingJob === job.id}
                        className="rounded-lg px-2.5 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 disabled:opacity-50 dark:text-primary-400 dark:hover:bg-primary-900/30"
                      >
                        {togglingJob === job.id ? '…' : job.is_active ? 'Hide' : 'Unhide'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {jobsPage && (
            <button
              type="button"
              onClick={loadMoreJobs}
              className="mt-3 w-full text-center text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              Load more jobs
            </button>
          )}
        </div>

        {/* User management */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            User Management
          </h2>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Search accounts and suspend or reactivate them.
          </p>

          <input
            type="search"
            className="input mt-4"
            placeholder="Search by name, username, or email..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
          />

          <div className="mt-4 max-h-[26rem] overflow-y-auto pr-1">
            {usersLoading ? (
              <div className="py-8"><Spinner /></div>
            ) : users.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">No users found.</p>
            ) : (
              <ul className="space-y-2">
                {users.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900/40"
                  >
                    <div className="min-w-0">
                      <Link
                        to={`/u/${u.username}`}
                        className="block truncate text-sm font-medium text-gray-800 hover:text-primary-600 dark:text-gray-200"
                      >
                        {u.display_name}
                        {u.verified && (
                          <span className="ml-1 text-xs text-green-600 dark:text-green-400">✓</span>
                        )}
                      </Link>
                      <p className="truncate text-xs text-gray-400">
                        @{u.username} · {u.school_display || u.email}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {u.is_suspended && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                          Suspended
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => applyUserAction(u.id, u.is_suspended ? 'unsuspend' : 'suspend')}
                        disabled={suspendTarget === u.id}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
                          u.is_suspended
                            ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {suspendTarget === u.id ? '…' : u.is_suspended ? 'Reactivate' : 'Suspend'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Skills management */}
      <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Skills Management
          </h2>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Add and remove the skills students can list on their profiles.
          </p>
        </div>

        <form onSubmit={handleAddSkill} className="mb-5 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            className="input flex-1"
            placeholder="Skill name (e.g. Makeup Artist)"
            value={skillForm.name}
            onChange={(e) => setSkillForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <input
            type="text"
            className="input sm:w-28"
            placeholder="Emoji"
            value={skillForm.icon}
            onChange={(e) => setSkillForm((prev) => ({ ...prev, icon: e.target.value }))}
          />
          <button type="submit" className="btn-primary sm:w-auto" disabled={addingSkill}>
            {addingSkill ? 'Adding…' : 'Add Skill'}
          </button>
        </form>

        {skillsLoading ? (
          <div className="py-6"><Spinner /></div>
        ) : skills.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
            No skills yet. Add your first one above.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {skills.map((skill) => (
              <li
                key={skill.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/40"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {skill.icon && <span className="text-lg leading-none">{skill.icon}</span>}
                  <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                    {skill.name}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteSkill(skill)}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}