import { useState } from 'react'
import { Link, useNavigate, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NotificationBell from './NotificationBell'
import { getProfileImageUrl, getInitials } from '../utils/format'

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout, darkMode, toggleDarkMode } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const navigate = useNavigate()

  const navLinkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/50 dark:text-primary-200'
        : 'text-gray-600 hover:bg-gray-50 hover:text-primary-600 dark:text-gray-300 dark:hover:bg-gray-800'
    }`

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-700 dark:bg-gray-900/90">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-lg font-black text-white">
                SP
              </span>
              <span className="hidden text-lg font-bold text-gray-900 dark:text-white sm:block">
                Skill<span className="text-primary-600">Plug</span>
              </span>
            </Link>

            <div className="hidden items-center gap-1 md:flex">
              <NavLink to="/freelancers" className={navLinkClass}>Freelancers</NavLink>
              <NavLink to="/jobs" className={navLinkClass}>Jobs</NavLink>
              {isAuthenticated && (
                <NavLink to="/dashboard" className={navLinkClass}>Dashboard</NavLink>
              )}
              {isAdmin && (
                <>
                  <NavLink to="/admin/verifications" className={navLinkClass}>Verifications</NavLink>
                  <NavLink to="/admin/overview" className={navLinkClass}>Overview</NavLink>
                  <NavLink to="/admin/reports" className={navLinkClass}>Reports</NavLink>
                </>
              )}
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {isAuthenticated && <NotificationBell />}
            <button
              type="button"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              {darkMode ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {isAuthenticated && user ? (
              <>
                <Link to="/jobs/post" className="btn-primary">Post a Job</Link>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserOpen(!userOpen)}
                    className="flex items-center gap-2"
                  >
                    {user.profile_image ? (
                      <img
                        src={getProfileImageUrl(user.profile_image)}
                        alt={user.display_name}
                        className="h-9 w-9 rounded-full object-cover ring-2 ring-primary-500"
                      />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 ring-2 ring-primary-500 dark:bg-primary-900 dark:text-primary-200">
                        {getInitials(user.display_name)}
                      </span>
                    )}
                  </button>
                  {userOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                      <div className="border-b border-gray-100 px-4 py-2 dark:border-gray-700">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.display_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                      </div>
                      <Link
                        to={`/u/${user.username}`}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                        onClick={() => setUserOpen(false)}
                      >
                        My Profile
                      </Link>
                      <Link
                        to="/profile/edit"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                        onClick={() => setUserOpen(false)}
                      >
                        Edit Profile
                      </Link>
                      <Link
                        to="/portfolio"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                        onClick={() => setUserOpen(false)}
                      >
                        My Portfolio
                      </Link>
                      <Link
                        to="/messages"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                        onClick={() => setUserOpen(false)}
                      >
                        Messages
                      </Link>
                      <Link
                        to="/settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                        onClick={() => setUserOpen(false)}
                      >
                        Settings
                      </Link>
                      <button
                        type="button"
                        onClick={() => { setUserOpen(false); logout() }}
                        className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-secondary">Sign In</Link>
                <Link to="/signup" className="btn-primary">Get Started</Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {isAuthenticated && <NotificationBell />}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              aria-label="Open menu"
            >
              {mobileOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {mobileOpen && (
        <div className="border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900 md:hidden">
          <div className="flex flex-col gap-1">
            <NavLink to="/freelancers" className={navLinkClass} onClick={() => setMobileOpen(false)}>Freelancers</NavLink>
            <NavLink to="/jobs" className={navLinkClass} onClick={() => setMobileOpen(false)}>Jobs</NavLink>
            {isAuthenticated && (
              <>
                <NavLink to="/dashboard" className={navLinkClass} onClick={() => setMobileOpen(false)}>Dashboard</NavLink>
                <NavLink to="/jobs/post" className={navLinkClass} onClick={() => setMobileOpen(false)}>Post a Job</NavLink>
                <NavLink to={`/u/${user?.username}`} className={navLinkClass} onClick={() => setMobileOpen(false)}>My Profile</NavLink>
                <NavLink to="/messages" className={navLinkClass} onClick={() => setMobileOpen(false)}>Messages</NavLink>
                <NavLink to="/settings" className={navLinkClass} onClick={() => setMobileOpen(false)}>Settings</NavLink>
              </>
            )}
            {isAdmin && (
              <>
                <NavLink to="/admin/verifications" className={navLinkClass} onClick={() => setMobileOpen(false)}>Verifications</NavLink>
                <NavLink to="/admin/overview" className={navLinkClass} onClick={() => setMobileOpen(false)}>Overview</NavLink>
                <NavLink to="/admin/reports" className={navLinkClass} onClick={() => setMobileOpen(false)}>Reports</NavLink>
              </>
            )}
            {!isAuthenticated && (
              <div className="mt-3 flex gap-2">
                <Link to="/login" className="btn-secondary flex-1" onClick={() => setMobileOpen(false)}>Sign In</Link>
                <Link to="/signup" className="btn-primary flex-1" onClick={() => setMobileOpen(false)}>Get Started</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}