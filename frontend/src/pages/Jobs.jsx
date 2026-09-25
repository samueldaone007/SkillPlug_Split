import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import JobCard from '../components/JobCard'
import Skeleton from '../components/Skeleton'
import { getErrorMessage } from '../utils/format'
import { useToast } from '../components/Toast'
import { usePageMeta } from '../hooks/usePageMeta'

const BUDGET_TYPES = [
  { value: '', label: 'All Budget Types' },
  { value: 'fixed', label: 'Fixed Price' },
  { value: 'hourly', label: 'Hourly Rate' },
  { value: 'negotiable', label: 'Negotiable' },
]

const SORTS = [
  { value: '', label: 'Newest First' },
  { value: 'applications', label: 'Most Applications' },
]

export default function Jobs() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAuthenticated } = useAuth()
  const { showToast } = useToast()
  const [jobs, setJobs] = useState([])
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [nextPage, setNextPage] = useState(null)

  const search = searchParams.get('search') || ''
  const budgetType = searchParams.get('budget_type') || ''
  const skill = searchParams.get('skill') || ''
  const location = searchParams.get('location') || ''
  const sort = searchParams.get('sort') || ''
  usePageMeta('Job Board', 'Find freelance jobs posted by clients and hire verified Nigerian student talent.')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const load = async () => {
      try {
        const params = {}
        if (search) params.search = search
        if (budgetType) params.budget_type = budgetType
        if (skill) params.skill = skill
        if (location) params.location = location
        if (sort) params.sort = sort

        const [jobsRes, skillsRes] = await Promise.all([
          api.get('/jobs/', { params }),
          skills.length === 0 ? api.get('/skills/') : Promise.resolve({ data: skills }),
        ])
        if (cancelled) return
        setJobs(jobsRes.data.results || jobsRes.data)
        setNextPage(jobsRes.data.next || null)
        setSkills(skillsRes.data)
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, budgetType, skill, location, sort])

  const updateParams = (updates) => {
    const params = Object.fromEntries(searchParams.entries())
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params[key] = value
      else delete params[key]
    })
    setSearchParams(params)
  }

  const loadMore = async () => {
    if (!nextPage) return
    try {
      const { data } = await api.get(nextPage.replace(import.meta.env.VITE_API_URL || '/api/v1', ''))
      setJobs((prev) => [...prev, ...(data.results || data)])
      setNextPage(data.next || null)
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Job Board</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Find freelance opportunities posted by clients.
          </p>
        </div>
        {isAuthenticated && (
          <Link to="/jobs/post" className="btn-primary">Post a Job</Link>
        )}
      </div>

      {/* Filters */}
      <div className="card mb-6 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
          <input
            type="search"
            className="input"
            placeholder="Search jobs by title, description, or skill..."
            value={search}
            onChange={(e) => updateParams({ search: e.target.value })}
          />
          <input
            type="search"
            className="input"
            placeholder="Location (e.g. Lagos)"
            value={location}
            onChange={(e) => updateParams({ location: e.target.value })}
          />
          <select
            className="input"
            value={budgetType}
            onChange={(e) => updateParams({ budget_type: e.target.value })}
          >
            {BUDGET_TYPES.map((bt) => (
              <option key={bt.value} value={bt.value}>{bt.label}</option>
            ))}
          </select>
          <select
            className="input"
            value={skill}
            onChange={(e) => updateParams({ skill: e.target.value })}
          >
            <option value="">All Skills</option>
            {skills.map((s) => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
          <select
            className="input"
            value={sort}
            onChange={(e) => updateParams({ sort: e.target.value })}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900 dark:text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5">
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-6 w-3/4" />
              </div>
              <div className="mt-3 space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-gray-500 dark:text-gray-400">No jobs match your search.</p>
          <button type="button" onClick={() => setSearchParams({})} className="btn-primary mt-4">
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
          {nextPage && (
            <div className="mt-8 text-center">
              <button type="button" onClick={loadMore} className="btn-secondary">
                Load More
              </button>
            </div>
          )}
        </>
      )}

      <p className="mt-8 text-center text-xs text-gray-400">
        All budgets in Nigerian Naira (₦)
      </p>
    </div>
  )
}