import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import Spinner from '../components/Spinner'
import { getErrorMessage } from '../utils/format'
import { usePageMeta } from '../hooks/usePageMeta'

const STEPS = [
  { id: 'skills', label: 'Skills', icon: '🎯' },
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'portfolio', label: 'Portfolio', icon: '🎨' },
  { id: 'verify', label: 'Verification', icon: '✅' },
]

export default function Onboarding() {
  const { user, fetchUser } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [skills, setSkills] = useState([])
  const [selectedSkills, setSelectedSkills] = useState([])
  const [form, setForm] = useState({
    school: '',
    department: '',
    whatsapp: '',
    bio: '',
    full_name: '',
  })
  const [portfolioItems, setPortfolioItems] = useState([])
  const [newPortfolioItem, setNewPortfolioItem] = useState({
    title: '',
    description: '',
    project_url: '',
    image: null,
    imagePreview: null,
  })
  const [verificationDoc, setVerificationDoc] = useState(null)
  const [docPreview, setDocPreview] = useState(null)

  usePageMeta('Complete Your Profile')

  useEffect(() => {
    const load = async () => {
      try {
        const [userRes, skillsRes] = await Promise.all([
          api.get('/auth/profile/'),
          api.get('/skills/'),
        ])
        setSkills(skillsRes.data.results || skillsRes.data)
        const u = userRes.data
        setForm({
          school: u.school || '',
          department: u.department || '',
          whatsapp: u.whatsapp || '',
          bio: u.bio || '',
          full_name: u.full_name || '',
        })
        if (u.portfolio_items) setPortfolioItems(u.portfolio_items)
      } catch {
        showToast('Failed to load onboarding data', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [showToast])

  useEffect(() => {
    if (user?.profile_complete) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  if (loading) return <Spinner />

  const isStudent = user?.account_type === 'student' || user?.account_type === 'both'
  const isClient = user?.account_type === 'client'

  const currentStep = STEPS[step]
  const canGoNext = step < STEPS.length - 1
  const isLastStep = step === STEPS.length - 1

  const handleSkillToggle = (skillId) => {
    setSelectedSkills((prev) =>
      prev.includes(skillId)
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId]
    )
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handlePortfolioChange = (e) => {
    const { name, value, files } = e.target
    if (name === 'image' && files?.[0]) {
      const file = files[0]
      setNewPortfolioItem((prev) => ({ ...prev, image: file }))
      setDocPreview(URL.createObjectURL(file))
    } else {
      setNewPortfolioItem((prev) => ({ ...prev, [name]: value }))
    }
  }

  const addPortfolioItem = async () => {
    if (!newPortfolioItem.title.trim()) return
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('title', newPortfolioItem.title)
      formData.append('description', newPortfolioItem.description)
      formData.append('project_url', newPortfolioItem.project_url)
      if (newPortfolioItem.image) formData.append('image', newPortfolioItem.image)
      const { data } = await api.post('/portfolio/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setPortfolioItems((prev) => [...prev, data])
      setNewPortfolioItem({ title: '', description: '', project_url: '', image: null, imagePreview: null })
      if (docPreview) URL.revokeObjectURL(docPreview)
      setDocPreview(null)
      showToast('Portfolio item added', 'success')
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  const removePortfolioItem = async (id) => {
    if (!confirm('Delete this portfolio item?')) return
    try {
      await api.delete(`/portfolio/${id}/`)
      setPortfolioItems((prev) => prev.filter((i) => i.id !== id))
      showToast('Deleted', 'success')
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    }
  }

  const handleDocChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setVerificationDoc(file)
      setDocPreview(URL.createObjectURL(file))
    }
  }

  const submitStep = async () => {
    if (step === 0) {
      if (isStudent && selectedSkills.length === 0) {
        showToast('Select at least one skill', 'warning')
        return
      }
      setSaving(true)
      try {
        await api.patch('/auth/profile/', { skills: selectedSkills })
        await fetchUser()
        showToast('Skills saved', 'success')
        setStep(1)
      } catch (err) {
        showToast(getErrorMessage(err), 'error')
      } finally {
        setSaving(false)
      }
    } else if (step === 1) {
      const required = isStudent
        ? ['school', 'department', 'whatsapp', 'bio']
        : ['bio']
      const missing = required.filter((f) => !form[f]?.trim())
      if (missing.length) {
        showToast(`Please fill: ${missing.join(', ')}`, 'warning')
        return
      }
      setSaving(true)
      try {
        await api.patch('/auth/profile/', form)
        await fetchUser()
        showToast('Profile saved', 'success')
        setStep(2)
      } catch (err) {
        showToast(getErrorMessage(err), 'error')
      } finally {
        setSaving(false)
      }
    } else if (step === 2) {
      setStep(3)
    } else if (step === 3) {
      setSaving(true)
      try {
        if (verificationDoc) {
          const formData = new FormData()
          formData.append('verification_doc', verificationDoc)
          formData.append('verification_requested', 'true')
          await api.patch('/auth/profile/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        }
        await fetchUser()
        showToast('Welcome to SkillPlug! 🎉', 'success')
        navigate('/dashboard', { replace: true })
      } catch (err) {
        showToast(getErrorMessage(err), 'error')
      } finally {
        setSaving(false)
      }
    }
  }

  const renderStep = () => {
    switch (currentStep.id) {
      case 'skills':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">What are your skills?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Select all that apply. You can add more later.
            </p>
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSkillToggle(s.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition ${
                    selectedSkills.includes(s.id)
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200'
                  }`}
                >
                  {s.icon && <span className="mr-1">{s.icon}</span>}
                  {s.name}
                </button>
              ))}
            </div>
            {skills.length === 0 && (
              <p className="text-sm text-gray-500">No skills available yet.</p>
            )}
          </div>
        )

      case 'profile':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Tell us about yourself</h3>
            {isStudent && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">School / University</label>
                  <input
                    name="school"
                    value={form.school}
                    onChange={handleFormChange}
                    className="input"
                    placeholder="e.g. University of Lagos"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Department / Course</label>
                  <input
                    name="department"
                    value={form.department}
                    onChange={handleFormChange}
                    className="input"
                    placeholder="e.g. Computer Science"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">WhatsApp Number</label>
                  <input
                    name="whatsapp"
                    value={form.whatsapp}
                    onChange={handleFormChange}
                    className="input"
                    placeholder="e.g. 2348012345678"
                    required
                  />
                </div>
              </div>
            )}
            {isClient && (
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  name="full_name"
                  value={form.full_name}
                  onChange={handleFormChange}
                  className="input"
                  placeholder="Your full name"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Bio</label>
              <textarea
                name="bio"
                value={form.bio}
                onChange={handleFormChange}
                className="input"
                rows={4}
                placeholder="Describe yourself, your experience, what you're looking for..."
                required
              />
            </div>
          </div>
        )

      case 'portfolio':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Portfolio (optional)</h3>
              {portfolioItems.length && (
                <span className="text-sm text-gray-500">{portfolioItems.length} item(s)</span>
              )}
            </div>
            <div className="card p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  name="title"
                  value={newPortfolioItem.title}
                  onChange={handlePortfolioChange}
                  className="input"
                  placeholder="Project title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  name="description"
                  value={newPortfolioItem.description}
                  onChange={handlePortfolioChange}
                  className="input"
                  rows={3}
                  placeholder="What did you build? What was your role?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Project URL (optional)</label>
                <input
                  name="project_url"
                  type="url"
                  value={newPortfolioItem.project_url}
                  onChange={handlePortfolioChange}
                  className="input"
                  placeholder="https://github.com/... or live demo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Image</label>
                <input
                  name="image"
                  type="file"
                  accept="image/*"
                  onChange={handlePortfolioChange}
                  className="input"
                />
                {newPortfolioItem.imagePreview && (
                  <img src={newPortfolioItem.imagePreview} alt="Preview" className="mt-2 h-24 w-auto rounded object-cover" />
                )}
              </div>
              <button
                type="button"
                onClick={addPortfolioItem}
                disabled={saving || !newPortfolioItem.title.trim()}
                className="btn-primary"
              >
                {saving ? 'Adding...' : 'Add Item'}
              </button>
            </div>
            {portfolioItems.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {portfolioItems.map((item) => (
                  <div key={item.id} className="card relative overflow-hidden">
                    {item.image && <img src={item.image} alt={item.title} className="h-32 w-full object-cover" />}
                    <div className="p-3">
                      <h4 className="font-medium">{item.title}</h4>
                      <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePortfolioItem(item.id)}
                      className="absolute top-2 right-2 rounded bg-red-500 p-1 text-white hover:bg-red-600"
                      aria-label="Delete"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-sm text-gray-500">You can skip this and add portfolio items later from your dashboard.</p>
          </div>
        )

      case 'verify':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Verify your identity (optional)</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Verified freelancers get a badge, higher trust, and more job invites.
              Upload a valid ID (student ID, national ID, driver's license, or passport).
            </p>
            <div className="card p-6">
              {docPreview ? (
                <div className="space-y-3">
                  <img src={docPreview} alt="ID preview" className="max-h-64 mx-auto rounded border" />
                  <button
                    type="button"
                    onClick={() => { setVerificationDoc(null); URL.revokeObjectURL(docPreview); setDocPreview(null) }}
                    className="btn-secondary text-sm"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleDocChange}
                    id="verify-doc"
                    className="sr-only"
                  />
                  <label htmlFor="verify-doc" className="cursor-pointer">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">Click to upload ID document</p>
                    <p className="text-xs text-gray-400">PNG, JPG, or PDF · Max 5MB</p>
                  </label>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500">
              You can also request verification later from Settings → Verification.
            </p>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex flex-col items-center flex-1 relative">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition ${
                    i < step
                      ? 'bg-green-500 text-white'
                      : i === step
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {i < step ? '✓' : s.icon}
                </div>
                <span className="mt-1 text-xs text-center text-gray-500 dark:text-gray-400">{s.label}</span>
                {i < STEPS.length - 1 && (
                  <div
                    className={`absolute top-5 left-1/2 w-full h-1 -ml-1/2 ${
                      i < step ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="card animate-fade-in">
          <div className="p-6">
            {renderStep()}
          </div>
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="btn-secondary disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={submitStep}
              disabled={saving}
              className={isLastStep ? 'btn-primary' : 'btn-primary'}
            >
              {saving
                ? 'Saving...'
                : isLastStep
                ? 'Finish & Start Using SkillPlug'
                : 'Continue'}
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Already have a profile?{' '}
          <Link to="/dashboard" className="font-medium text-primary-600 hover:underline">
            Go to Dashboard
          </Link>
        </p>
      </div>
    </div>
  )
}