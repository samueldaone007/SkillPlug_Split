import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import JobCard from '../components/JobCard'
import Spinner from '../components/Spinner'
import { getErrorMessage } from '../utils/format'
import { useToast } from '../components/Toast'

const BUDGET_TYPES = [
  { value: '', label: 'All Budget Types' },
  { value: 'fixed', label: 'Fixed Price' },
  { value: 'hourly', label: 'Hourly Rate' },
  { value: 'negotiable', label: 'Negotiable' },
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

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const load = async () => {
      try {
        const params = {}
        if (search) params.search = search
        if (budgetType) params.budget_type = budgetType
        if (skill) params.skill = skill

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
  }, [search, budgetType, skill])

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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            type="search"
            className="input"
            placeholder="Search jobs by title, description, or skill..."
            value={search}
            onChange={(e) => updateParams({ search: e.target.value })}
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
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900 dark:text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <Spinner />
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