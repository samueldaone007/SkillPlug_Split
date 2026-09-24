import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import FreelancerCard from '../components/FreelancerCard'
import Spinner from '../components/Spinner'
import { getErrorMessage } from '../utils/format'
import { useToast } from '../components/Toast'

export default function SavedFreelancers() {
  const [freelancers, setFreelancers] = useState([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await api.get('/users/saved/')
        if (!cancelled) setFreelancers(data.results || data)
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Saved Freelancers</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Freelancers you've bookmarked for later.
        </p>
      </div>

      {freelancers.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-gray-500 dark:text-gray-400">You haven't saved any freelancers yet.</p>
          <Link to="/freelancers" className="btn-primary mt-4">Browse Freelancers</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {freelancers.map((freelancer) => (
            <FreelancerCard key={freelancer.id} freelancer={freelancer} />
          ))}
        </div>
      )}
    </div>
  )
}