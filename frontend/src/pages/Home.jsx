import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import FreelancerCard from '../components/FreelancerCard'
import Spinner from '../components/Spinner'
import StarRating from '../components/StarRating'
import { getProfileImageUrl, getInitials } from '../utils/format'
import { usePageMeta } from '../hooks/usePageMeta'
import { useTheme } from '../hooks/useTheme'

const MARQUEE_ITEMS = [
  'Hire Student Talent',
  'No Fees. Ever.',
  'In-App Chat',
  'Verified Profiles',
  'Grow Your Portfolio',
  'Post Jobs Free',
]

export default function Home() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { isAuthenticated } = useAuth()
  const theme = useTheme()
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

  return (
    <div className="overflow-x-clip">
      {theme === 'brutal' && <BrutalHome data={data} isAuthenticated={isAuthenticated} />}
      {theme === 'glassy' && <GlassyHome data={data} isAuthenticated={isAuthenticated} />}
      {theme === 'classic' && <ClassicHome data={data} isAuthenticated={isAuthenticated} />}
    </div>
  )
}

/* =============================================================================
   BRUTAL — neo-brutalist landing
   ============================================================================= */

function BrutalHome({ data, isAuthenticated }) {
  const heroFreelancer = data.featured?.[0] || data.recent?.[0] || null
  const heroFreelancer2 = data.featured?.[1] || data.recent?.[1] || null

  const stats = [
    { label: 'Student Freelancers', value: data.total_freelancers },
    { label: 'Verified Students', value: data.verified_freelancers },
    { label: 'Skills Offered', value: data.total_skills },
  ]

  return (
    <>
      {/* Marquee */}
      <div className="marquee-wrap overflow-hidden border-b-2 border-[color:var(--card-border)] bg-lemon py-2.5">
        <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
          {[0, 1].map((row) => (
            <div key={row} className="flex gap-10">
              {MARQUEE_ITEMS.map((item, i) => (
                <span key={`${row}-${i}`} className="flex items-center gap-10 text-sm font-bold uppercase tracking-widest text-ink">
                  {item}
                  <span className="text-base leading-none">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Hero */}
      <section className="px-4 pb-16 pt-12 sm:px-6 lg:px-8 lg:pt-16">
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <span className="sticker bg-sky text-ink">★ Trusted by Nigerian students</span>

            <h1 className="mt-6 text-5xl font-extrabold leading-[1.02] tracking-tight text-ink dark:text-white sm:text-6xl lg:text-7xl">
              Hire
              <br />
              <span className="highlight mt-2">big talent</span>
              <br />
              for free<span className="text-hot">.</span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink/70 dark:text-gray-300">
              Verified student freelancers for creative work, tutoring, business support, tech and more.
              No fees, no middlemen — chat, hire and collaborate right in the app.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/freelancers" className="btn-primary text-base">Find a Freelancer →</Link>
              <Link to="/jobs" className="btn-secondary text-base">Browse Jobs</Link>
              {!isAuthenticated && (
                <Link to="/signup" className="sticker bg-hot text-white">Join Free</Link>
              )}
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              {stats.map((stat, i) => (
                <div
                  key={stat.label}
                  className={`rounded-lg border-2 border-ink px-4 py-3 shadow-bru dark:border-white dark:shadow-bru-w ${
                    i === 0 ? 'bg-white' : i === 1 ? 'bg-lime' : 'bg-sky'
                  }`}
                >
                  <div className="text-2xl font-extrabold text-ink">{stat.value}+</div>
                  <div className="mt-0.5 max-w-[7rem] text-[10px] font-bold uppercase leading-tight tracking-wide text-ink/70">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="relative -rotate-2 rounded-xl border-2 border-[color:var(--card-border)] bg-[var(--card-bg)] p-5 shadow-card">
              <span className="sticker absolute -right-3 -top-4 z-10 animate-wiggle bg-lime text-ink">★ Verified</span>
              <div className="flex items-center gap-3">
                {heroFreelancer?.profile_image ? (
                  <img src={getProfileImageUrl(heroFreelancer.profile_image)} alt={heroFreelancer.display_name} className="h-16 w-16 rounded-lg border-2 border-ink object-cover" />
                ) : (
                  <span className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-ink bg-primary-300 text-xl font-extrabold text-ink">
                    {getInitials(heroFreelancer?.display_name || 'Talent')}
                  </span>
                )}
                <div>
                  <p className="text-lg font-bold text-ink dark:text-white">{heroFreelancer?.display_name || 'Student Talent'}</p>
                  <p className="text-xs font-semibold text-ink/60 dark:text-gray-400">{heroFreelancer?.school_display || 'Verified student freelancer'}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <StarRating rating={heroFreelancer?.avg_rating || 5} size="sm" />
                    <span className="text-xs font-bold text-ink/60">({heroFreelancer?.review_count || 2})</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(heroFreelancer?.skills?.slice(0, 3) || [{ id: 's1', name: 'Design' }, { id: 's2', name: 'Writing' }, { id: 's3', name: 'Tutoring' }]).map((s) => (
                  <span key={s.id} className="badge-primary">{s.icon && <span className="mr-0.5">{s.icon}</span>}{s.name}</span>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-lg border-2 border-ink bg-lime px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink">
                <span className="h-2 w-2 rounded-full bg-ink" /> Available for work
              </div>
            </div>

            <div className="absolute -bottom-6 -left-4 rotate-3 rounded-xl border-2 border-ink bg-sky p-4 shadow-bru dark:border-white dark:bg-sky dark:shadow-bru-w">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-ink bg-white text-lg">💼</span>
                <div>
                  <p className="text-sm font-extrabold uppercase tracking-wide text-ink">New job posted</p>
                  <p className="text-xs font-bold text-ink/70">
                    {heroFreelancer?.display_name?.split(' ')[0] || 'A client'} matched instantly
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute -right-4 -top-6 flex -rotate-3 items-center gap-2 rounded-full border-2 border-ink bg-hot px-4 py-2 shadow-bru dark:border-white dark:shadow-bru-w">
              <span className="text-lg">💬</span>
              <span className="text-xs font-extrabold uppercase tracking-wide text-white">
                Chat with {heroFreelancer2?.display_name?.split(' ')[0] || 'talent'} — free
              </span>
            </div>

            <div aria-hidden className="absolute -right-2 bottom-10 h-24 w-24 rounded-xl border-4 border-dashed border-hot" />
          </div>
        </div>
      </section>

      <SectionShell>
        {data.featured.length > 0 &&
          <FeaturedBand data={data} />
        }

        {data.top_rated.length > 0 &&
          <TopRatedBand data={data} />
        }

        {data.skills.length > 0 &&
          <SkillsBand data={data} />
        }

        {data.recent.length > 0 &&
          <RecentBand data={data} />
        }

        {!isAuthenticated && (
          <section className="px-4 py-14 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <div className="relative overflow-hidden rounded-2xl border-2 border-ink bg-hot p-10 shadow-bru-lg dark:border-white dark:shadow-bru-lg-w sm:p-14">
                <span className="sticker absolute right-6 top-6 hidden animate-wiggle bg-lemon text-ink sm:inline-flex">100% Free</span>
                <h2 className="max-w-2xl text-3xl font-extrabold uppercase leading-tight tracking-tight text-white sm:text-5xl">
                  Start earning with your skills today
                </h2>
                <p className="mt-4 max-w-xl text-lg font-semibold text-white/85">
                  Join thousands of Nigerian students making money from their phone — for free.
                </p>
                <Link to="/signup" className="btn-primary mt-8">Create Free Account →</Link>
              </div>
            </div>
          </section>
        )}
      </SectionShell>
    </>
  )
}

/* =============================================================================
   GLASSY — violet glassmorphism landing
   ============================================================================= */

function GlassyHome({ data, isAuthenticated }) {
  const heroFreelancer = data.featured?.[0] || data.recent?.[0] || null
  const heroSkills = heroFreelancer?.skills?.slice(0, 3) || [{ id: 's1', name: 'Design' }, { id: 's2', name: 'Writing' }, { id: 's3', name: 'Tutoring' }]

  const stats = [
    { label: 'Student Freelancers', value: data.total_freelancers },
    { label: 'Verified Students', value: data.verified_freelancers },
    { label: 'Skills Offered', value: data.total_skills },
  ]

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-purple-600 to-fuchsia-600">
        <div aria-hidden className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-fuchsia-400/30 blur-3xl" />
        <div aria-hidden className="absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-violet-300/30 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div>
            <span className="inline-flex items-center rounded-full border border-white/40 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur">
              ★ Trusted by Nigerian students
            </span>

            <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Hire big talent
              <br />
              <span className="mt-2 inline-block rounded-2xl bg-white/15 px-3 py-1 text-white backdrop-blur">
                for free.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-violet-100">
              Verified student freelancers for creative work, tutoring, business support, tech and more.
              No fees, no middlemen — chat, hire and collaborate right in the app.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/freelancers" className="inline-flex items-center rounded-full bg-white px-7 py-3 text-sm font-semibold text-violet-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-violet-50">
                Find a Freelancer →
              </Link>
              <Link to="/jobs" className="inline-flex items-center rounded-full border border-white/40 bg-white/10 px-7 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20">
                Browse Jobs
              </Link>
              {!isAuthenticated && (
                <Link to="/signup" className="inline-flex items-center rounded-full border border-white/40 bg-white/10 px-7 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20">
                  Join Free
                </Link>
              )}
            </div>

            <div className="mt-12 grid max-w-lg grid-cols-3 gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/20 bg-white/10 p-5 text-center text-white backdrop-blur">
                  <div className="text-2xl font-bold">{stat.value}+</div>
                  <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-violet-100">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative hidden lg:block" aria-label="Featured freelancer">
            <div className="relative rotate-2 animate-float rounded-[2.5rem] border border-white/30 bg-white/20 p-8 shadow-float backdrop-blur-2xl">
              <span className="sticker absolute -right-4 -top-5 z-10 animate-float text-white">★ Verified</span>
              <div className="flex items-center gap-4">
                {heroFreelancer?.profile_image ? (
                  <img src={getProfileImageUrl(heroFreelancer.profile_image)} alt={heroFreelancer.display_name} className="h-20 w-20 rounded-full border-2 border-white/60 object-cover" />
                ) : (
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 text-2xl font-bold text-white">
                    {getInitials(heroFreelancer?.display_name || 'Talent')}
                  </span>
                )}
                <div>
                  <p className="text-xl font-bold text-white">{heroFreelancer?.display_name || 'Student Talent'}</p>
                  <p className="text-sm font-medium text-violet-100">{heroFreelancer?.school_display || 'Verified student freelancer'}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <StarRating rating={heroFreelancer?.avg_rating || 5} size="sm" />
                    <span className="text-xs font-semibold text-violet-100">({heroFreelancer?.review_count || 2})</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {heroSkills.map((s) => (
                  <span key={s.id} className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                    {s.icon && <span className="mr-1">{s.icon}</span>}{s.name}
                  </span>
                ))}
              </div>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-400/90 px-4 py-1.5 text-xs font-semibold text-emerald-950 shadow-lg">
                <span className="h-2 w-2 rounded-full bg-emerald-900" /> Available for work
              </div>
            </div>

            <div className="absolute -bottom-8 -left-8 -rotate-3 animate-float-delayed rounded-3xl border border-white/30 bg-white/20 p-5 shadow-float backdrop-blur-2xl">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-xl">💼</span>
                <div>
                  <p className="text-sm font-bold text-white">New job posted</p>
                  <p className="text-xs font-medium text-violet-100">Matched instantly</p>
                </div>
              </div>
            </div>

            <div className="absolute -right-6 -top-6 flex rotate-3 animate-float items-center gap-2 rounded-full bg-white/20 px-4 py-2 backdrop-blur-2xl">
              <span className="text-lg">💬</span>
              <span className="text-xs font-bold text-white">Chat free with talent</span>
            </div>
          </div>
        </div>
      </section>

      <SectionShell>
        {data.featured.length > 0 &&
          <FeaturedBand data={data} glassy />
        }

        {data.top_rated.length > 0 &&
          <TopRatedBand data={data} glassy />
        }

        {data.skills.length > 0 &&
          <SkillsBand data={data} glassy />
        }

        {data.recent.length > 0 &&
          <RecentBand data={data} glassy />
        }

        {!isAuthenticated && (
          <section className="px-4 py-14 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <div className="relative overflow-hidden rounded-[2.5rem] border border-white/30 bg-gradient-to-br from-violet-600 to-fuchsia-600 p-10 shadow-float sm:p-14">
                <div aria-hidden className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
                <span className="sticker absolute right-8 top-8 hidden text-white sm:inline-flex">100% Free</span>
                <h2 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
                  Start earning with your skills today
                </h2>
                <p className="mt-4 max-w-xl text-lg font-medium text-violet-100">
                  Join thousands of Nigerian students making money from their phone — for free.
                </p>
                <Link to="/signup" className="relative mt-8 inline-flex items-center rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-violet-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-violet-50">
                  Create Free Account →
                </Link>
              </div>
            </div>
          </section>
        )}
      </SectionShell>
    </>
  )
}

/* =============================================================================
   CLASSIC — original clean emerald landing
   ============================================================================= */

function ClassicHome({ data, isAuthenticated }) {
  const stats = [
    { label: 'Student Freelancers', value: data.total_freelancers },
    { label: 'Verified Students', value: data.verified_freelancers },
    { label: 'Skills Offered', value: data.total_skills },
  ]

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-emerald-50/80 via-white to-white" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-24">
          <span className="inline-flex items-center rounded-full bg-emerald-100/80 px-4 py-1.5 text-xs font-semibold text-emerald-700">
            ★ Trusted by Nigerian students
          </span>

          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl dark:text-white">
            Hire verified <span className="text-emerald-600">student talent</span> for free
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-gray-500 dark:text-gray-400">
            Verified student freelancers for creative work, tutoring, business support, tech and more.
            No fees, no middlemen — chat, hire and collaborate right in the app.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link to="/freelancers" className="btn-primary">Find a Freelancer →</Link>
            <Link to="/jobs" className="btn-secondary">Browse Jobs</Link>
            {!isAuthenticated && (
              <Link to="/signup" className="btn-secondary">Join Free</Link>
            )}
          </div>

          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{stat.value}+</div>
                <div className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SectionShell>
        {data.featured.length > 0 &&
          <FeaturedBand data={data} classic />
        }

        {data.top_rated.length > 0 &&
          <TopRatedBand data={data} classic />
        }

        {data.skills.length > 0 &&
          <SkillsBand data={data} classic />
        }

        {data.recent.length > 0 &&
          <RecentBand data={data} classic />
        }

        {!isAuthenticated && (
          <section className="px-4 py-14 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-500 p-10 shadow-lg sm:p-14">
                <div aria-hidden className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/10" />
                <h2 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
                  Start earning with your skills today
                </h2>
                <p className="mt-4 max-w-xl text-lg font-medium text-emerald-50">
                  Join thousands of Nigerian students making money from their phone — for free.
                </p>
                <Link to="/signup" className="relative mt-8 inline-flex items-center rounded-lg bg-white px-7 py-3.5 text-sm font-semibold text-emerald-700 shadow-md transition hover:-translate-y-0.5 hover:bg-emerald-50">
                  Create Free Account →
                </Link>
              </div>
            </div>
          </section>
        )}
      </SectionShell>
    </>
  )
}

/* =============================================================================
   SHARED SECTION BANDS (themed via wrapper classes + global components)
   ============================================================================= */

function FeaturedBand({ data, classic }) {
  return (
    <section className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <SectionHeading>Verified <span className="heading-accent">Freelancers</span></SectionHeading>
          <Link to="/freelancers?verified=true" className="btn-secondary btn-sm">View all →</Link>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.featured.slice(0, 6).map((freelancer, i) => (
            <div key={freelancer.id} className={cardRotation(i, classic)}>
              <FreelancerCard freelancer={freelancer} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function TopRatedBand({ data, glassy, classic }) {
  return (
    <section className="px-4 py-10 sm:px-6 lg:px-8">
      <div className={`mx-auto max-w-7xl ${panelWrap(glassy, classic)}`}>
        <div className="mb-6 flex items-center justify-between gap-3">
          <SectionHeading>Top Rated</SectionHeading>
          <span className="sticker hidden sm:inline-flex">🔥 5-star club</span>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {data.top_rated.map((freelancer) => (
            <FreelancerCard key={freelancer.id} freelancer={freelancer} />
          ))}
        </div>
      </div>
    </section>
  )
}

function SkillsBand({ data, glassy, classic }) {
  return (
    <section className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading className="mb-6">Popular <span className="heading-accent">Skills</span></SectionHeading>
        <div className="flex flex-wrap gap-3">
          {data.skills.map((skill, i) => (
            <Link
              key={skill.id}
              to={`/freelancers?skill=${encodeURIComponent(skill.name)}`}
              className={skillChip(i, classic, glassy)}
            >
              <span className="mr-1">{skill.icon}</span>
              {skill.name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function RecentBand({ data }) {
  return (
    <section className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading className="mb-6">Recently Joined</SectionHeading>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {data.recent.map((freelancer) => (
            <div key={freelancer.id} className="card -rotate-1 p-4">
              <Link to={`/u/${freelancer.username}`} className="flex items-center gap-3">
                {freelancer.profile_image ? (
                  <img src={getProfileImageUrl(freelancer.profile_image)} alt="" className="h-11 w-11 rounded-lg border-2 border-ink object-cover" />
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg border-2 border-ink bg-primary-300 text-sm font-extrabold text-ink dark:bg-primary-700 dark:text-white">
                    {getInitials(freelancer.display_name)}
                  </span>
                )}
                <div>
                  <p className="text-sm font-bold text-ink dark:text-white">{freelancer.display_name}</p>
                  <p className="text-xs font-semibold text-ink/60 dark:text-gray-400">{freelancer.school_display || 'Student'}</p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SectionShell({ children }) {
  return <div>{children}</div>
}

function SectionHeading({ children, className = '' }) {
  return (
    <h2 className={`section-heading text-2xl font-extrabold text-ink dark:text-white ${className}`}>
      {children}
    </h2>
  )
}

/* Helpers to shape utility classes per theme flavour */

function cardRotation(i, classic) {
  if (classic) return ''
  return i % 2 === 0 ? 'rotate-[0.5deg]' : '-rotate-[0.5deg]'
}

function panelWrap(glassy, classic) {
  if (glassy) return 'rounded-3xl border border-violet-200/70 bg-white/60 p-6 shadow-lg shadow-violet-500/10 backdrop-blur-xl sm:p-10 dark:border-violet-500/20 dark:bg-gray-800/50'
  if (classic) return 'rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10 dark:border-gray-700 dark:bg-gray-800'
  return 'rounded-xl border-2 border-[color:var(--card-border)] bg-[var(--card-bg)] p-6 shadow-card sm:p-10'
}

function skillChip(i, classic, glassy) {
  if (classic) {
    return 'inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:text-emerald-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:text-emerald-400'
  }
  if (glassy) {
    return i % 3 === 2
      ? 'inline-flex items-center gap-2 rounded-full border border-fuchsia-200 bg-fuchsia-100/70 px-4 py-2 text-sm font-semibold text-fuchsia-700 backdrop-blur transition hover:-translate-y-0.5 hover:bg-fuchsia-200/80 dark:border-fuchsia-500/30 dark:bg-fuchsia-500/15 dark:text-fuchsia-300'
      : 'inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-100/70 px-4 py-2 text-sm font-semibold text-violet-700 backdrop-blur transition hover:-translate-y-0.5 hover:bg-violet-200/80 dark:border-violet-500/30 dark:bg-violet-500/15 dark:text-violet-300'
  }
  return `rounded-full border-2 border-ink px-4 py-2 text-sm font-bold shadow-bru-sm transition-transform hover:-translate-y-0.5 hover:shadow-bru dark:border-white dark:shadow-bru-sm-w ${
    i % 3 === 0 ? 'bg-lemon text-ink' : i % 3 === 1 ? 'bg-sky text-ink' : 'bg-white text-ink dark:bg-[#1c1c1c] dark:text-white'
  }`
}