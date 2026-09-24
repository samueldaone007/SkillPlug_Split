import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="hidden border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 md:block">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-3 gap-8">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">SkillPlug</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Connecting Nigerian students with clients who need affordable digital services.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Explore</h3>
            <ul className="mt-2 space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <li><Link to="/freelancers" className="hover:text-primary-600">Find Freelancers</Link></li>
              <li><Link to="/jobs" className="hover:text-primary-600">Browse Jobs</Link></li>
              <li><Link to="/jobs/post" className="hover:text-primary-600">Post a Job</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">For Students</h3>
            <ul className="mt-2 space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <li><Link to="/dashboard" className="hover:text-primary-600">Dashboard</Link></li>
              <li><Link to="/my-applications" className="hover:text-primary-600">My Applications</Link></li>
              <li><Link to="/portfolio" className="hover:text-primary-600">My Portfolio</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-200 pt-6 text-center text-sm text-gray-400 dark:border-gray-700 dark:text-gray-500">
          &copy; {new Date().getFullYear()} SkillPlug. Built with care for Nigerian students.
        </div>
      </div>
    </footer>
  )
}