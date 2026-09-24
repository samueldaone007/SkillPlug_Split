import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../api/client'
import { useToast } from '../components/Toast'
import Spinner from '../components/Spinner'
import { getErrorMessage } from '../utils/format'

const BUDGET_TYPES = [
  { value: 'fixed', label: 'Fixed Price' },
  { value: 'hourly', label: 'Hourly Rate' },
  { value: 'negotiable', label: 'Negotiable' },
]

export default function JobForm({ edit: _edit }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const isEditing = Boolean(id)
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    budget_type: 'fixed',
    budget_min: '',
    budget_max: '',
    budget_display: '',
    required_skills: [],
    status: 'open',
    location_preference: '',
    contact_email: '',
    contact_whatsapp: '',
  })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [skillsRes, jobRes] = await Promise.all([
          api.get('/skills/'),
          isEditing ? api.get(`/jobs/${id}/`) : Promise.resolve(null),
        ])
        if (cancelled) return
        setSkills(skillsRes.data)
        if (jobRes?.data) {
          setForm({
            title: jobRes.data.title || '',
            description: jobRes.data.description || '',
            budget_type: jobRes.data.budget_type || 'fixed',
            budget_min: jobRes.data.budget_min || '',
            budget_max: jobRes.data.budget_max || '',
            budget_display: jobRes.data.budget_display || '',
            required_skills: jobRes.data.required_skills?.map((s) => s.id) || [],
            status: jobRes.data.status || 'open',
            location_preference: jobRes.data.location_preference || '',
            contact_email: jobRes.data.contact_email || '',
            contact_whatsapp: jobRes.data.contact_whatsapp || '',
          })
        }
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
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const toggleSkill = (skillId) => {
    setForm((prev) => ({
      ...prev,
      required_skills: prev.required_skills.includes(skillId)
        ? prev.required_skills.filter((sid) => sid !== skillId)
        : [...prev.required_skills, skillId],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        ...form,
        budget_min: form.budget_min || null,
        budget_max: form.budget_max || null,
      }
      if (isEditing) {
        await api.put(`/jobs/${id}/`, payload)
        showToast('Job updated successfully!', 'success')
        navigate(`/jobs/${id}`)
      } else {
        const { data } = await api.post('/jobs/create/', payload)
        showToast('Job posted successfully!', 'success')
        navigate(`/jobs/${data.id}`)
      }
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
          {isEditing ? 'Edit Job' : 'Post a Job'}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {isEditing ? 'Update your job posting.' : 'Tell students what you need.'}
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
            <label className="label" htmlFor="title">Job Title</label>
            <input
              id="title"
              name="title"
              type="text"
              required
              className="input"
              placeholder="e.g. Logo design for my startup"
              value={form.title}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="label" htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              rows="5"
              required
              className="input"
              placeholder="Describe the job, requirements, and deliverables..."
              value={form.description}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="budget_type">Budget Type</label>
              <select id="budget_type" name="budget_type" className="input" value={form.budget_type} onChange={handleChange}>
                {BUDGET_TYPES.map((bt) => (
                  <option key={bt.value} value={bt.value}>{bt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="budget_display">Budget Display</label>
              <input
                id="budget_display"
                name="budget_display"
                type="text"
                className="input"
                placeholder="e.g. ₦5,000 - ₦10,000 or Negotiable"
                value={form.budget_display}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="budget_min">Minimum (₦)</label>
              <input
                id="budget_min"
                name="budget_min"
                type="number"
                min="0"
                className="input"
                placeholder="5000"
                value={form.budget_min}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="label" htmlFor="budget_max">Maximum (₦)</label>
              <input
                id="budget_max"
                name="budget_max"
                type="number"
                min="0"
                className="input"
                placeholder="10000"
                value={form.budget_max}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label className="label">Required Skills</label>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => {
                const selected = form.required_skills.includes(skill.id)
                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => toggleSkill(skill.id)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                      selected
                        ? 'border-primary-600 bg-primary-600 text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-primary-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                  >
                    {skill.name}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="location_preference">Location Preference</label>
            <input
              id="location_preference"
              name="location_preference"
              type="text"
              className="input"
              placeholder="e.g. Remote, Lagos, Anywhere"
              value={form.location_preference}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="contact_email">Contact Email</label>
              <input
                id="contact_email"
                name="contact_email"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={form.contact_email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="label" htmlFor="contact_whatsapp">Contact WhatsApp</label>
              <input
                id="contact_whatsapp"
                name="contact_whatsapp"
                type="text"
                className="input"
                placeholder="2348012345678"
                value={form.contact_whatsapp}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving...' : isEditing ? 'Update Job' : 'Post Job'}
            </button>
            <Link to={isEditing ? `/jobs/${id}` : '/jobs'} className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}