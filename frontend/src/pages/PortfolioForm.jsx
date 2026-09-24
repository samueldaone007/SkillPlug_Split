import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../api/client'
import { useToast } from '../components/Toast'
import Spinner from '../components/Spinner'
import { getErrorMessage } from '../utils/format'

export default function PortfolioForm({ edit }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const isEditing = Boolean(id)
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    image: null,
    project_url: '',
  })

  useEffect(() => {
    if (!isEditing) return
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await api.get(`/portfolio/${id}/`)
        if (cancelled) return
        setForm({
          title: data.title || '',
          description: data.description || '',
          project_url: data.project_url || '',
          image: null,
        })
      } catch (err) {
        showToast(getErrorMessage(err), 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditing])

  const handleChange = (e) => {
    const { name, value, files } = e.target
    if (files) {
      setForm((prev) => ({ ...prev, [name]: files[0] }))
    } else {
      setForm((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const data = new FormData()
      Object.entries(form).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          data.append(key, value)
        }
      })

      if (isEditing) {
        await api.put(`/portfolio/${id}/`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        showToast('Portfolio item updated successfully!', 'success')
      } else {
        await api.post('/portfolio/', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        showToast('Portfolio item added successfully!', 'success')
      }
      navigate('/portfolio')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isEditing ? 'Edit Portfolio Item' : 'Add Portfolio Item'}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Showcase a project to attract clients.
        </p>
      </div>

      <div className="card p-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900 dark:text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label" htmlFor="title">Title</label>
            <input
              id="title"
              name="title"
              type="text"
              required
              className="input"
              placeholder="e.g. E-commerce Website Design"
              value={form.title}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="label" htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              rows="4"
              className="input"
              placeholder="Describe the project, your role, and the outcome..."
              value={form.description}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="label" htmlFor="image">Project Image</label>
            <input
              id="image"
              name="image"
              type="file"
              accept="image/*"
              required={!isEditing}
              className="input"
              onChange={handleChange}
            />
            {isEditing && !form.image && (
              <p className="mt-1 text-xs text-gray-400">Leave empty to keep the current image.</p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="project_url">Project URL</label>
            <input
              id="project_url"
              name="project_url"
              type="url"
              className="input"
              placeholder="https://your-project.com"
              value={form.project_url}
              onChange={handleChange}
            />
          </div>

          <div className="flex gap-3">
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving...' : isEditing ? 'Update Item' : 'Add Item'}
            </button>
            <Link to="/portfolio" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  )
}