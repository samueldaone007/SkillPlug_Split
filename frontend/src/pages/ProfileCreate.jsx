import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import Spinner from '../components/Spinner'
import { getErrorMessage } from '../utils/format'

const UNIVERSITIES = [
  'unilag', 'ui', 'oau', 'uniben', 'abu', 'unn', 'lautech', 'covenant',
  'babcock', 'futa', 'futo', 'lasu', 'eksu', 'other',
]

const DEPARTMENTS = [
  'Computer Science', 'Software Engineering', 'Electrical Engineering',
  'Mechanical Engineering', 'Chemical Engineering', 'Mass Communication',
  'Business Administration', 'Accounting', 'Economics', 'Fine Arts',
  'Architecture', 'Medicine', 'Law', 'English & Literature',
  'Mathematics', 'Physics', 'Statistics', 'English Language',
]

export default function ProfileCreate() {
  const { user, updateUser } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [isStudent, setIsStudent] = useState(true)
  const [skills, setSkills] = useState([])
  const [skillSelect, setSkillSelect] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    full_name: '',
    school: '',
    department: '',
    bio: '',
    whatsapp: '',
    availability_status: 'available',
    skills: [],
    profile_image: null,
    verification_doc: null,
  })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [skillsRes] = await Promise.all([
          api.get('/skills/'),
        ])
        if (!cancelled) {
          setSkills(skillsRes.data)
          if (user) {
            setForm((prev) => ({
              ...prev,
              full_name: user.full_name || '',
              school: user.school || '',
              department: user.department || '',
              bio: user.bio || '',
              whatsapp: user.whatsapp || '',
              availability_status: user.availability_status || 'available',
              skills: user.skills_detail?.map((s) => s.id) || user.skills || [],
            }))
            setIsStudent(user.account_type !== 'client')
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user])

  const handleChange = (e) => {
    const { name, value, files } = e.target
    if (files) {
      setForm((prev) => ({ ...prev, [name]: files[0] }))
    } else {
      setForm((prev) => ({ ...prev, [name]: value }))
    }
  }

  const addSkill = (e) => {
    const skillId = Number(e.target.value)
    setSkillSelect('')
    if (!skillId) return
    setForm((prev) => {
      const current = Array.isArray(prev.skills) ? prev.skills : []
      if (current.includes(skillId)) return prev
      return { ...prev, skills: [...current, skillId] }
    })
  }

  const removeSkill = (skillId) => {
    setForm((prev) => ({
      ...prev,
      skills: (Array.isArray(prev.skills) ? prev.skills : []).filter((id) => id !== skillId),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const data = new FormData()
      Object.entries(form).forEach(([key, value]) => {
        if (key === 'skills' && isStudent && Array.isArray(value)) {
          value.forEach((id) => data.append('skills', id))
        } else if (key !== 'skills' && value !== null && value !== undefined && value !== '') {
          data.append(key, value)
        }
      })

      const { data: updated } = await api.put('/auth/profile/', data)
      updateUser(updated)
      showToast('Profile created successfully!', 'success')
      navigate('/dashboard')
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Complete Your Profile</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Tell clients about yourself so they can find you.
        </p>
      </div>

      <div className="card p-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900 dark:text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isStudent && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="school">University</label>
                  <select id="school" name="school" className="input" value={form.school} onChange={handleChange}>
                    <option value="">Select your university</option>
                    {UNIVERSITIES.map((code) => (
                      <option key={code} value={code}>
                        {code.charAt(0).toUpperCase() + code.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="department">Department</label>
                  <select id="department" name="department" className="input" value={form.department} onChange={handleChange}>
                    <option value="">Select your department</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label" htmlFor="whatsapp">WhatsApp Number</label>
                <input
                  id="whatsapp"
                  name="whatsapp"
                  type="text"
                  className="input"
                  placeholder="2348012345678"
                  value={form.whatsapp}
                  onChange={handleChange}
                />
                <p className="mt-1 text-xs text-gray-400">Include country code (e.g., 2348012345678)</p>
              </div>
            </>
          )}

          <div>
            <label className="label" htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              name="bio"
              rows="4"
              maxLength="1000"
              className="input"
              placeholder="Tell clients about yourself, your skills and experience..."
              value={form.bio}
              onChange={handleChange}
            />
          </div>

          {isStudent && (
            <>
              <div>
                <label className="label" htmlFor="skills">Your Skills</label>
                <select
                  id="skills"
                  name="skills"
                  className="input"
                  value={skillSelect}
                  onChange={addSkill}
                >
                  <option value="">Select a skill to add...</option>
                  {skills
                    .filter((skill) => !(form.skills || []).includes(skill.id))
                    .map((skill) => (
                      <option key={skill.id} value={skill.id}>
                        {skill.icon ? `${skill.icon} ` : ''}{skill.name}
                      </option>
                    ))}
                </select>
                <p className="mt-1 text-xs text-gray-400">
                  Choose from the list to add a skill.
                </p>
                {(form.skills || []).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(form.skills || [])
                      .map((id) => skills.find((s) => s.id === id))
                      .filter(Boolean)
                      .map((skill) => (
                        <span
                          key={skill.id}
                          className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        >
                          {skill.icon && <span>{skill.icon}</span>}
                          {skill.name}
                          <button
                            type="button"
                            onClick={() => removeSkill(skill.id)}
                            className="ml-0.5 text-gray-400 transition-colors hover:text-red-500"
                            aria-label={`Remove ${skill.name}`}
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                  </div>
                )}
              </div>

              <div>
                <label className="label" htmlFor="availability_status">Availability</label>
                <select
                  id="availability_status"
                  name="availability_status"
                  className="input"
                  value={form.availability_status}
                  onChange={handleChange}
                >
                  <option value="available">Available for Work</option>
                  <option value="busy">Currently Busy</option>
                  <option value="not_available">Not Available</option>
                </select>
              </div>

              <div>
                <label className="label" htmlFor="profile_image">Profile Photo</label>
                <input
                  id="profile_image"
                  name="profile_image"
                  type="file"
                  accept="image/*"
                  className="input"
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="label" htmlFor="verification_doc">Student ID (for verification)</label>
                <input
                  id="verification_doc"
                  name="verification_doc"
                  type="file"
                  accept="image/*"
                  className="input"
                  onChange={handleChange}
                />
                <p className="mt-1 text-xs text-gray-400">Upload your student ID — it will be submitted for admin verification.</p>
              </div>
            </>
          )}

          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}