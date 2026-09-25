import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import FreelancerCard from '../components/FreelancerCard'
import Spinner from '../components/Spinner'
import { getProfileImageUrl, getInitials } from '../utils/format'
import { usePageMeta } from '../hooks/usePageMeta'

export default function Home() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { isAuthenticated } = useAuth()
  usePageMeta(null, 'SkillPlug connects you with verified Nigerian student freelancers for design, development, writing and more.')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await api.get('/home/')
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
  if (!data) return <div className="py-16 text-center text-gray-500">Could not load data.</div>

  const stats = [
    { label: 'Student Freelancers', value: data.total_freelancers },
    { label: 'Verified Students', value: data.verified_freelancers },
    { label: 'Skills Offered', value: data.total_skills },
  ]

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary-50 to-transparent py-16 dark:from-primary-900/20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            Connect with{' '}
            <span className="bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent">
              Nigerian Student Talent
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
            Affordable, verified student freelancers for web design, writing, social media, and more.
            Find your next collaborator or grow your portfolio.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/freelancers" className="btn-primary text-base">Find a Freelancer</Link>
            <Link to="/jobs" className="btn-secondary text-base">Browse Jobs</Link>
            {!isAuthenticated && (
              <Link to="/signup" className="btn-secondary text-base">Join as a Student</Link>
            )}
          </div>

          <div className="mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="card p-4">
                <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {stat.value}+
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured freelancers */}
      {data.featured.length > 0 && (
        <section className="py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Verified Freelancers</h2>
              <Link to="/freelancers?verified=true" className="text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.featured.slice(0, 6).map((freelancer) => (
                <FreelancerCard key={freelancer.id} freelancer={freelancer} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Top rated */}
      {data.top_rated.length > 0 && (
        <section className="py-12 bg-white dark:bg-gray-800/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Top Rated</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {data.top_rated.map((freelancer) => (
                <FreelancerCard key={freelancer.id} freelancer={freelancer} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Popular skills */}
      {data.skills.length > 0 && (
        <section className="py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Popular Skills</h2>
            <div className="flex flex-wrap gap-3">
              {data.skills.map((skill) => (
                <Link
                  key={skill.id}
                  to={`/freelancers?skill=${encodeURIComponent(skill.name)}`}
                  className="badge badge-primary px-3 py-2 text-sm hover:bg-primary-200 dark:hover:bg-primary-800"
                >
                  <span className="mr-1">{skill.icon}</span>
                  {skill.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recently joined */}
      {data.recent.length > 0 && (
        <section className="py-12 bg-white dark:bg-gray-800/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recently Joined</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.recent.map((freelancer) => (
                <div key={freelancer.id} className="card p-4 flex items-center gap-3">
                  <Link to={`/u/${freelancer.username}`} className="flex items-center gap-3">
                    {freelancer.profile_image ? (
                      <img src={getProfileImageUrl(freelancer.profile_image)} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900 dark:text-primary-200">
                        {getInitials(freelancer.display_name)}
                      </span>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{freelancer.display_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{freelancer.school_display || 'Student'}</p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      {!isAuthenticated && (
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="card bg-gradient-to-r from-primary-600 to-primary-800 p-8 text-center">
              <h2 className="text-2xl font-bold text-white">Ready to start earning?</h2>
              <p className="mt-2 text-primary-100">
                Join thousands of Nigerian students making money with their skills.
              </p>
              <Link to="/signup" className="mt-6 inline-block rounded-lg bg-white px-6 py-3 font-semibold text-primary-700 hover:bg-primary-50">
                Create Free Account
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}