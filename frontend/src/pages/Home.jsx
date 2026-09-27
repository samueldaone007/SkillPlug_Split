import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import FreelancerCard from '../components/FreelancerCard'
import Spinner from '../components/Spinner'
import StarRating from '../components/StarRating'
import { getProfileImageUrl, getInitials } from '../utils/format'
import { usePageMeta } from '../hooks/usePageMeta'

export default function Home() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { isAuthenticated } = useAuth()
  usePageMeta(null, 'SkillPlug connects you with verified Nigerian student freelancers for creative work, tutoring, business support, tech, and more.')

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

  const heroFreelancer = data.featured?.[0] || data.recent?.[0] || null
  const heroFreelancer2 = data.featured?.[1] || data.recent?.[1] || null

  const stats = [
    { label: 'Student Freelancers', value: data.total_freelancers },
    { label: 'Verified Students', value: data.verified_freelancers },
    { label: 'Skills Offered', value: data.total_skills },
  ]

  return (
    <div className="overflow-x-clip">
      {/* Hero */}
      <section className="relative px-4 pb-16 pt-14 sm:px-6 lg:px-8 lg:pt-20">
        {/* Ambient background */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 left-1/2 h-[540px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-br from-primary-300/40 via-accent-300/30 to-transparent blur-3xl dark:from-primary-900/40 dark:via-accent-900/20" />
          <div className="absolute right-0 top-1/3 h-72 w-72 rounded-full bg-accent-300/30 blur-3xl dark:bg-accent-800/20" />
          <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-primary-200/40 blur-3xl dark:bg-primary-900/30" />
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1fr_1.05fr]">
          {/* Copy */}
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full glass px-3.5 py-1.5 text-xs font-semibold text-primary-700 shadow-sm dark:text-primary-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
              </span>
              Trusted by Nigerian students
            </span>

            <h1 className="mt-5 text-5xl font-bold leading-[1.05] tracking-tight text-gray-900 dark:text-white sm:text-6xl">
              Hire great skills.
              <br />
              <span className="text-gradient">Grow fast.</span>
            </h1>

            <p className="mt-5 max-w-lg text-lg leading-relaxed text-gray-600 dark:text-gray-300">
              Verified student freelancers for creative projects, tutoring, business support, tech, and more.
              Find your next collaborator — or turn your skills into income today.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/freelancers" className="btn-primary text-base">Find a Freelancer</Link>
              <Link to="/jobs" className="btn-secondary text-base">Browse Jobs</Link>
              {!isAuthenticated && (
                <Link to="/signup" className="btn-secondary text-base">Join for Free</Link>
              )}
            </div>

            {/* Inline stats */}
            <div className="mt-10 flex max-w-md items-center justify-between divide-x divide-gray-200 dark:divide-gray-800">
              {stats.map((stat) => (
                <div key={stat.label} className="pr-4 pl-4 first:pl-0">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}+</div>
                  <div className="mt-0.5 text-xs leading-tight text-gray-500 dark:text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Floating visual */}
          <div className="relative hidden h-[460px] lg:block">
            {/* Profile card */}
            <div className="glass animate-float absolute left-1/2 top-4 w-72 -translate-x-1/2 rounded-4xl p-5 shadow-float">
              <div className="flex items-center gap-3">
                {heroFreelancer?.profile_image ? (
                  <img src={getProfileImageUrl(heroFreelancer.profile_image)} alt={heroFreelancer.display_name} className="h-14 w-14 rounded-full object-cover ring-2 ring-primary-200 dark:ring-primary-800" />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-fuchsia-500 text-lg font-bold text-white">
                    {getInitials(heroFreelancer?.display_name || 'Talent')}
                  </span>
                )}
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{heroFreelancer?.display_name || 'Student Talent'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{heroFreelancer?.school_display || 'Verified student freelancer'}</p>
                </div>
                <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700 dark:bg-green-900 dark:text-green-300">
                  Available
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <StarRating rating={heroFreelancer?.avg_rating || 5} size="sm" />
                <span className="text-xs text-gray-400">({heroFreelancer?.review_count || 2} reviews)</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(heroFreelancer?.skills?.slice(0, 3) || [{ id: 's1', name: 'Design' }, { id: 's2', name: 'Writing' }, { id: 's3', name: 'Tutoring' }]).map((s) => (
                  <span key={s.id} className="badge-primary">{s.icon && <span className="mr-0.5">{s.icon}</span>}{s.name}</span>
                ))}
              </div>
            </div>

            {/* New job toast */}
            <div className="glass animate-float-delay absolute -left-2 top-16 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-card">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-fuchsia-500 text-lg text-white">💼</span>
              <div>
                <p className="text-xs font-semibold text-gray-900 dark:text-white">New job posted</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{heroFreelancer?.display_name?.split(' ')[0] || 'A client'} found a match</p>
              </div>
            </div>

            {/* Conversation card */}
            <div className="glass animate-float absolute bottom-10 right-0 w-64 rounded-2xl px-4 py-3 shadow-card" style={{ animationDelay: '2.4s' }}>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent-400 to-fuchsia-500 text-xs font-bold text-white">
                  {getInitials(heroFreelancer2?.display_name || 'Collaborator')}
                </span>
                <p className="text-xs font-semibold text-gray-900 dark:text-white">Team up & build together — free in-app chat</p>
              </div>
              <div className="mt-2 flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-400" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-400" style={{ animationDelay: '0.15s' }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-400" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>

            {/* Decorative ring */}
            <div aria-hidden className="absolute right-4 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full border-2 border-dashed border-primary-300/60 dark:border-primary-700/60" />
          </div>
        </div>
      </section>

      {/* Featured freelancers */}
      {data.featured.length > 0 && (
        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Verified Freelancers</h2>
              <Link to="/freelancers?verified=true" className="rounded-full px-3 py-1.5 text-sm font-semibold text-primary-600 transition hover:bg-primary-50 hover:text-primary-700 dark:text-primary-400 dark:hover:bg-primary-900/40">
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
        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="glass rounded-4xl p-6 sm:p-10">
              <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Top Rated</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {data.top_rated.map((freelancer) => (
                  <FreelancerCard key={freelancer.id} freelancer={freelancer} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Popular skills */}
      {data.skills.length > 0 && (
        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Popular Skills</h2>
            <div className="flex flex-wrap gap-3">
              {data.skills.map((skill) => (
                <Link
                  key={skill.id}
                  to={`/freelancers?skill=${encodeURIComponent(skill.name)}`}
                  className="badge badge-primary cursor-pointer rounded-full px-3 py-2 text-sm transition hover:-translate-y-0.5 hover:shadow-md"
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
        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recently Joined</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {data.recent.map((freelancer) => (
                <div key={freelancer.id} className="card flex items-center gap-3 p-4">
                  <Link to={`/u/${freelancer.username}`} className="flex items-center gap-3">
                    {freelancer.profile_image ? (
                      <img src={getProfileImageUrl(freelancer.profile_image)} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-fuchsia-500 text-sm font-bold text-white dark:from-primary-500 dark:to-fuchsia-600">
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
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="relative overflow-hidden rounded-4xl bg-gradient-to-r from-primary-700 via-primary-600 to-fuchsia-600 p-10 text-center">
              <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute -bottom-12 right-0 h-48 w-48 rounded-full bg-black/10 blur-2xl" />
              </div>
              <h2 className="relative text-3xl font-bold text-white sm:text-4xl">Ready to start earning?</h2>
              <p className="relative mx-auto mt-3 max-w-xl text-primary-100">
                Join thousands of Nigerian students making money with their skills — for free, straight from your phone.
              </p>
              <Link to="/signup" className="relative mt-7 inline-block rounded-full bg-white px-8 py-3.5 font-semibold text-primary-700 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl">
                Create Free Account
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}