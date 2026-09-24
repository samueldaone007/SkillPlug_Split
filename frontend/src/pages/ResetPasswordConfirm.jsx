import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useToast } from '../components/Toast'
import { getErrorMessage } from '../utils/format'

export default function ResetPasswordConfirm() {
  const { uid, token } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [form, setForm] = useState({ new_password: '', new_password2: '' })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.new_password !== form.new_password2) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await api.post(`/auth/password-reset/confirm/${uid}/${token}/`, form)
      setSubmitted(true)
      showToast('Password reset successfully!', 'success')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Password Reset Complete</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Your password has been changed successfully. Redirecting to sign in...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-2xl font-black text-white">
            SP
          </span>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Set New Password</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Choose a new password for your account.
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
              <label className="label" htmlFor="new_password">New Password</label>
              <input
                id="new_password"
                name="new_password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="input"
                placeholder="Minimum 6 characters"
                value={form.new_password}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="label" htmlFor="new_password2">Confirm New Password</label>
              <input
                id="new_password2"
                name="new_password2"
                type="password"
                required
                autoComplete="new-password"
                className="input"
                placeholder="Re-enter new password"
                value={form.new_password2}
                onChange={handleChange}
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400">
                ← Back to Sign In
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}