import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import Spinner from '../components/Spinner'
import { getProfileImageUrl, getInitials, getErrorMessage } from '../utils/format'

const AVAILABILITY_LABELS = {
  available: 'Available for Work',
  busy: 'Currently Busy',
  not_available: 'Not Available',
}

const appStatusColors = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  accepted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

const jobStatusColors = {
  open: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  completed: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  closed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

export default function Dashboard() {
  const { user, updateUser } = useAuth()
  const { showToast } = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await api.get('/dashboard/')
        if (!cancelled) setData(data)
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) return <Spinner />
  if (!data) return <div className="py-16 text-center text-gray-500">Could not load dashboard.</div>

  const requestVerification = async () => {
    if (!user?.verification_doc) {
      showToast('Upload your student ID first, then request verification.', 'warning')
      return
    }
    setRequesting(true)
    try {
      const { data: updated } = await api.patch('/auth/profile/', { verification_requested: true })
      updateUser(updated)
      showToast('Verification submitted! An admin will review your student ID shortly.', 'success')
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    } finally {
      setRequesting(false)
    }
  }

  const stats = [
    {
      label: 'Portfolio Items',
      value: data.portfolio_count,
      tile: 'bg-primary-100 text-primary-600 dark:bg-primary-900/30',
      icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    },
    {
      label: 'Applications',
      value: data.total_applications,
      tile: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    },
    {
      label: 'Reviews',
      value: data.review_count,
      tile: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30',
      icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.034a1 1 0 00-1.176 0l-3.976 2.888c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z',
    },
    {
      label: 'Saved',
      value: data.saved_count,
      tile: 'bg-red-100 text-red-500 dark:bg-red-900/30',
      icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
    },
  ]

  return (
    <div>
      {/* Dashboard Header */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 py-10 dark:from-gray-900 dark:to-primary-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              {user?.profile_image ? (
                <img
                  src={getProfileImageUrl(user.profile_image)}
                  alt={user.display_name}
                  className="h-16 w-16 rounded-2xl object-cover ring-4 ring-white/20"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 text-2xl font-bold text-white ring-4 ring-white/20">
                  {getInitials(user?.display_name)}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-white md:text-3xl">
                  Welcome, {user?.display_name}!
                </h1>
                <p className="mt-1 text-sm text-primary-200">Manage your profile and track your activity</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to={`/u/${user?.username}`}
                className="rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                View Public Profile
              </Link>
              <Link
                to="/profile/edit"
                className="rounded-xl bg-white px-5 py-2.5 font-medium text-primary-700 shadow-lg transition-colors hover:bg-primary-50"
              >
                Edit Profile
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Content */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-3 flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.tile}`}>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main Column */}
          <div className="space-y-8 lg:col-span-2">
            {/* My Applications */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-gray-700">
                <h2 className="flex items-center text-lg font-bold text-gray-900 dark:text-white">
                  <svg className="mr-2 h-5 w-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  My Applications
                </h2>
                <Link to="/my-applications" className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
                  View All
                </Link>
              </div>
              {data.my_applications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">No applications yet</p>
                  <Link to="/jobs" className="mt-1 inline-block text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
                    Browse jobs
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {data.my_applications.map((app) => (
                    <div key={app.id} className="p-5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-start justify-between">
                        <div>
                          <Link
                            to={`/jobs/${app.job?.id}`}
                            className="font-semibold text-gray-900 transition-colors hover:text-primary-600 dark:text-white"
                          >
                            {app.job?.title}
                          </Link>
                          {app.job?.posted_by?.display_name && (
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{app.job.posted_by.display_name}</p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${appStatusColors[app.status] || appStatusColors.pending}`}>
                          {app.status?.charAt(0).toUpperCase() + app.status?.slice(1) || 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* My Job Posts */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-gray-700">
                <h2 className="flex items-center text-lg font-bold text-gray-900 dark:text-white">
                  <svg className="mr-2 h-5 w-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  My Job Posts
                </h2>
                <Link to="/my-jobs" className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
                  View All
                </Link>
              </div>
              {data.my_jobs.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">No job posts yet</p>
                  <Link to="/jobs/post" className="mt-1 inline-block text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
                    Post a job
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {data.my_jobs.map((job) => (
                    <div key={job.id} className="p-5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-start justify-between">
                        <div>
                          <Link
                            to={`/jobs/${job.id}`}
                            className="font-semibold text-gray-900 transition-colors hover:text-primary-600 dark:text-white"
                          >
                            {job.title}
                          </Link>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {job.application_count} application{job.application_count === 1 ? '' : 's'}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${jobStatusColors[job.status] || jobStatusColors.open}`}>
                          {job.status?.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Portfolio */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-gray-700">
                <h2 className="flex items-center text-lg font-bold text-gray-900 dark:text-white">
                  <svg className="mr-2 h-5 w-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Portfolio
                </h2>
                <Link to="/portfolio/add" className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
                  Add Item
                </Link>
              </div>
              {data.portfolio_items.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">No portfolio items yet</p>
                  <Link
                    to="/portfolio/add"
                    className="inline-flex items-center rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
                  >
                    <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Portfolio Item
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3">
                  {data.portfolio_items.map((item) => (
                    <div
                      key={item.id}
                      className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700"
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-gray-300 dark:text-gray-600">
                          {getInitials(item.title)}
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-end bg-black/50 p-3 opacity-0 transition-opacity group-hover:opacity-100">
                        <p className="truncate text-xs font-medium text-white">{item.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Link
                  to="/portfolio/add"
                  className="flex items-center rounded-xl px-4 py-3 text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <svg className="mr-3 h-5 w-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Portfolio Item
                </Link>
                <Link
                  to="/jobs/post"
                  className="flex items-center rounded-xl px-4 py-3 text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <svg className="mr-3 h-5 w-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Post a Job
                </Link>
                <Link
                  to="/jobs"
                  className="flex items-center rounded-xl px-4 py-3 text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <svg className="mr-3 h-5 w-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Find Work
                </Link>
              </div>
            </div>

            {/* Profile Status */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Profile Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Profile Complete</span>
                  {user?.profile_complete ? (
                    <span className="flex items-center text-sm font-medium text-green-600">
                      <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Yes
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-yellow-600">Incomplete</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Verification</span>
                  {user?.verified ? (
                    <span className="flex items-center text-sm font-medium text-green-600">
                      <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Verified
                    </span>
                  ) : user?.verification_requested ? (
                    <span className="text-sm font-medium text-yellow-600">Pending Review</span>
                  ) : (
                    <span className="text-sm font-medium text-gray-400">Not Requested</span>
                  )}
                </div>
                {!user?.verified && (
                  <div className="pt-1">
                    {user?.verification_requested ? (
                      <p className="text-xs text-gray-400">
                        Your student ID is being reviewed by an admin.
                      </p>
                    ) : user?.verification_doc ? (
                      <button
                        type="button"
                        onClick={requestVerification}
                        disabled={requesting}
                        className="w-full rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
                      >
                        {requesting ? 'Submitting...' : 'Request Verification'}
                      </button>
                    ) : (
                      <Link
                        to="/profile/edit"
                        className="block w-full rounded-xl border border-primary-300 bg-primary-50 px-4 py-2 text-center text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100 dark:border-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                      >
                        Upload Student ID to Get Verified
                      </Link>
                    )}
                    {user?.verification_reject_reason && (
                      <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                        <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                          Verification was rejected
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-red-600 dark:text-red-400">
                          {user.verification_reject_reason}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Availability</span>
                  <span
                    className={`text-sm font-medium ${
                      user?.availability_status === 'available'
                        ? 'text-green-600'
                        : user?.availability_status === 'busy'
                          ? 'text-yellow-600'
                          : 'text-gray-400'
                    }`}
                  >
                    {AVAILABILITY_LABELS[user?.availability_status] || user?.availability_status}
                  </span>
                </div>
              </div>
            </div>

            {/* Recommended */}
            {data.recommended.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Recommended
                </h3>
                <div className="space-y-4">
                  {data.recommended.map((r) => (
                    <Link to={`/u/${r.username}`} key={r.id} className="group flex items-center gap-3">
                      {r.profile_image ? (
                        <img
                          src={getProfileImageUrl(r.profile_image)}
                          alt={r.display_name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-sm font-bold text-white">
                          {getInitials(r.display_name)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900 transition-colors group-hover:text-primary-600 dark:text-white">
                          {r.display_name}
                        </p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{r.school_display}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}