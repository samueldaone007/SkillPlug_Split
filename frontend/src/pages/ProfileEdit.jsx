import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import Spinner from '../components/Spinner'
import { getErrorMessage, getProfileImageUrl } from '../utils/format'

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

export default function ProfileEdit() {
  const { user, updateUser } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isStudent = user?.is_student
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
        const skillsRes = await api.get('/skills/')
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

  const toggleSkill = (skillId) => {
    setForm((prev) => {
      const current = Array.isArray(prev.skills) ? prev.skills : []
      return {
        ...prev,
        skills: current.includes(skillId)
          ? current.filter((id) => id !== skillId)
          : [...current, skillId],
      }
    })
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
        } else if (key === 'skills' && !isStudent && Array.isArray(value)) {
          value.forEach((id) => data.append('skills', id))
        } else if (key !== 'skills' && value !== null && value !== undefined && value !== '') {
          data.append(key, value)
        }
      })

      const { data: updated } = await api.put('/auth/profile/', data)
      updateUser(updated)
      showToast('Profile updated successfully!', 'success')
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Profile</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Keep your information up to date.
        </p>
      </div>

      <div className="card p-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="mb-6 flex items-center gap-4">
          {user?.profile_image ? (
            <img
              src={getProfileImageUrl(user.profile_image)}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-lg font-bold text-primary-700 dark:bg-primary-900 dark:text-primary-200">
              {user?.display_name?.charAt(0)?.toUpperCase()}
            </span>
          )}
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{user?.display_name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label" htmlFor="full_name">Full Name</label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              className="input"
              value={form.full_name}
              onChange={handleChange}
            />
          </div>

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
                <label className="label">Your Skills</label>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => {
                    const selected = (form.skills || []).includes(skill.id)
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
                        {skill.icon && <span className="mr-1">{skill.icon}</span>}
                        {skill.name}
                      </button>
                    )
                  })}
                </div>
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
                {user?.profile_image && (
                  <p className="mt-1 text-xs text-gray-400">Current photo will be replaced if you upload a new one.</p>
                )}
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
              </div>
            </>
          )}

          <div className="flex gap-3">
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}