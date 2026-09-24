import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import FreelancerCard from '../components/FreelancerCard'
import Spinner from '../components/Spinner'
import { useToast } from '../components/Toast'
import { getErrorMessage } from '../utils/format'

const AVAILABILITY = [
  { value: '', label: 'All Availability' },
  { value: 'available', label: 'Available' },
  { value: 'busy', label: 'Busy' },
  { value: 'not_available', label: 'Not Available' },
]

const SORTS = [
  { value: 'recent', label: 'Recently Joined' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'name', label: 'Name' },
]

export default function Freelancers() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [freelancers, setFreelancers] = useState([])
  const [skills, setSkills] = useState([])
  const [universities, setUniversities] = useState([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState('')
  const [nextPage, setNextPage] = useState(null)

  const search = searchParams.get('search') || ''
  const school = searchParams.get('school') || ''
  const skill = searchParams.get('skill') || ''
  const availability = searchParams.get('availability') || ''
  const verified = searchParams.get('verified') === 'true'
  const sort = searchParams.get('sort') || 'recent'

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const load = async () => {
      try {
        const params = {}
        if (search) params.search = search
        if (school) params.school = school
        if (skill) params.skill = skill
        if (availability) params.availability = availability
        if (verified) params.verified = 'true'
        if (sort) params.sort = sort

        const [{ data }, skillsRes] = await Promise.all([
          api.get('/freelancers/', { params }),
          skills.length === 0 ? api.get('/skills/') : Promise.resolve({ data: skills }),
        ])

        if (cancelled) return
        setFreelancers(data.results || data)
        setNextPage(data.next || null)
        setSkills(skillsRes.data)
        setUniversities(universities.length === 0 ? initUniversities() : universities)
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, school, skill, availability, verified, sort])

  const initUniversities = () => [
    'University of Lagos (UNILAG)', 'University of Ibadan (UI)', 'Obafemi Awolowo University (OAU)',
    'University of Benin (UNIBEN)', 'Ahmadu Bello University (ABU)', 'University of Nigeria, Nsukka (UNN)',
    'Ladoke Akintola University (LAUTECH)', 'Covenant University', 'Babcock University',
    'Federal University of Technology, Akure (FUTA)', 'Federal University of Technology, Owerri (FUTO)',
    'Lagos State University (LASU)', 'Ekiti State University (EKSU)', 'Other Institution',
  ]

  const updateParams = (updates) => {
    const params = Object.fromEntries(searchParams.entries())
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params[key] = value
      else delete params[key]
    })
    if (!params.school && !params.search && !params.skill && !params.availability && !params.sort) {
      setSearchParams({})
    } else {
      setSearchParams(params)
    }
  }

  const loadMore = async () => {
    if (!nextPage) return
    setToggling(true)
    try {
      const { data } = await api.get(nextPage.replace(import.meta.env.VITE_API_URL || '/api/v1', ''))
      setFreelancers((prev) => [...prev, ...(data.results || data)])
      setNextPage(data.next || null)
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Browse Freelancers</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Find verified Nigerian student talent for your next project.
        </p>
      </div>

      {/* Search & Filters */}
      <div className="card mb-6 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <input
              type="search"
              className="input"
              placeholder="Search by name, skill, or bio..."
              value={search}
              onChange={(e) => updateParams({ search: e.target.value })}
            />
          </div>
          <select
            className="input"
            value={availability}
            onChange={(e) => updateParams({ availability: e.target.value })}
          >
            {AVAILABILITY.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
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
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={verified}
              onChange={(e) => updateParams({ verified: e.target.checked ? 'true' : '' })}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Verified only</span>
          </label>
        </div>

        {(skill || school) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {skill && (
              <button
                type="button"
                onClick={() => updateParams({ skill: '' })}
                className="badge-primary"
              >
                {skill} ×
              </button>
            )}
            {school && (
              <button
                type="button"
                onClick={() => updateParams({ school: '' })}
                className="badge-primary"
              >
                {school} ×
              </button>
            )}
          </div>
        )}

        {skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="mr-1 py-1 text-xs font-semibold uppercase text-gray-400">Skills:</span>
            {skills.slice(0, 15).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => updateParams({ skill: skill === s.name ? '' : s.name })}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  skill === s.name
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {s.icon && <span className="mr-0.5">{s.icon}</span>}
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900 dark:text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : freelancers.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-gray-500 dark:text-gray-400">No freelancers match your search.</p>
          <button type="button" onClick={() => setSearchParams({})} className="btn-primary mt-4">
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {freelancers.map((freelancer) => (
              <FreelancerCard key={freelancer.id} freelancer={freelancer} />
            ))}
          </div>

          {nextPage && (
            <div className="mt-8 text-center">
              <button type="button" onClick={loadMore} className="btn-secondary" disabled={toggling}>
                {toggling ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}