import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function MobileNav() {
  const { isAuthenticated } = useAuth()

  const base = 'flex flex-col items-center gap-1 px-2 py-1 text-[10px] font-medium'
  const active = 'text-primary-600 dark:text-primary-400'
  const inactive = 'text-gray-500 dark:text-gray-400'

  const Icon = ({ d }) => (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
    </svg>
  )

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur dark:border-gray-700 dark:bg-gray-900/95 md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4">
        <NavLink to="/" end className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
          <Icon d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10" />
          Home
        </NavLink>
        <NavLink to="/jobs" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
          <Icon d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          Jobs
        </NavLink>
        <NavLink to="/freelancers" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
          <Icon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2zm6 6.5c0 1.933-2.686 3.5-6 3.5s-6-1.567-6-3.5c0-.831.348-1.592.91-2.18.09.03.185.05.283.05.768 0 1.456-.354 1.9-.91a3.5 3.5 0 01.907-.027A5.999 5.999 0 006 12.5c0 .184.021.364.058.54A2.653 2.653 0 004.5 10.5a2.66 2.66 0 00-.5.052A1.999 1.999 0 005 9.5c.34 0 .656.08.941.232A6.996 6.996 0 012.998 8.5a7 7 0 1114 0c0 .72-.116 1.413-.316 2.064z" />
          Freelancers
        </NavLink>
        <NavLink
          to={isAuthenticated ? '/dashboard' : '/signup'}
          className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
        >
          <Icon d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          {isAuthenticated ? 'Me' : 'Sign Up'}
        </NavLink>
      </div>
    </nav>
  )
}