import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { getErrorMessage } from '../utils/format'

export default function Signup({ edit: _edit }) {
  const { register } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '',
    email: '',
    full_name: '',
    account_type: 'student',
    password: '',
    password2: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.password2) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await register(form)
      showToast('Welcome to SkillPlug! Please complete your profile.', 'success')
      navigate('/profile/create')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-2xl font-black text-white">
            SP
          </span>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Get Started</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Join SkillPlug and start earning with your skills
          </p>
        </div>

        <div className="card mt-8 p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900 dark:text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="input"
                placeholder="e.g. ademola_dev"
                value={form.username}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="label" htmlFor="full_name">Full Name</label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                className="input"
                placeholder="Your full name"
                value={form.full_name}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="label" htmlFor="account_type">I am a...</label>
              <select
                id="account_type"
                name="account_type"
                className="input"
                value={form.account_type}
                onChange={handleChange}
              >
                <option value="student">Student Freelancer</option>
                <option value="client">Client</option>
                <option value="both">Both</option>
              </select>
            </div>

            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="input"
                placeholder="Minimum 6 characters"
                value={form.password}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="label" htmlFor="password2">Confirm Password</label>
              <input
                id="password2"
                name="password2"
                type="password"
                required
                autoComplete="new-password"
                className="input"
                placeholder="Re-enter password"
                value={form.password2}
                onChange={handleChange}
              />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}