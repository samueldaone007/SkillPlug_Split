import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-6xl font-black text-primary-500">404</p>
      <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Page not found</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Link to="/" className="btn-primary">Go Home</Link>
        <Link to="/jobs" className="btn-secondary">Browse Jobs</Link>
      </div>
    </div>
  )
}