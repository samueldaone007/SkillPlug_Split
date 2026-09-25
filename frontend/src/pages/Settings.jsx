import { useState } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'

const NOTIFICATION_TYPES = [
  { key: 'application', label: 'Job applications', description: 'When someone applies to your job or your application status changes' },
  { key: 'review', label: 'Reviews', description: 'When someone reviews your profile' },
  { key: 'message', label: 'New messages', description: 'When someone sends you an in-app message' },
  { key: 'verification', label: 'Verification updates', description: 'When your verification is approved or rejected' },
  { key: 'system', label: 'System announcements', description: 'Important platform updates and moderation notices' },
]

export default function Settings() {
  const { user, updateUser } = useAuth()
  const { showToast } = useToast()
  const [soundEnabled, setSoundEnabled] = useState(user?.notification_sound_enabled !== false)
  const [prefs, setPrefs] = useState(user?.notification_preferences || {})
  const [saving, setSaving] = useState(false)

  const persist = async (patch) => {
    setSaving(true)
    try {
      const { data } = await api.patch('/auth/profile/', patch)
      updateUser(data)
      showToast('Settings saved!', 'success')
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to save settings.'
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleSound = () => {
    const next = !soundEnabled
    setSoundEnabled(next)
    persist({ notification_sound_enabled: next })
  }

  const togglePref = (key) => {
    const nextPrefs = { ...prefs, [key]: !prefs[key] }
    setPrefs(nextPrefs)
    persist({ notification_preferences: nextPrefs })
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Control how you receive notifications on SkillPlug.
      </p>

      <div className="card mt-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Notification sound</h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Play a chime when a new notification arrives.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={soundEnabled}
            onClick={toggleSound}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
              soundEnabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                soundEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="card mt-4 divide-y divide-gray-100 p-6 dark:divide-gray-700">
        <div className="pb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Email & in-app notifications</h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Toggle each notification type on or off.
          </p>
        </div>
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {NOTIFICATION_TYPES.map((t) => {
            const enabled = prefs[t.key] !== false
            return (
              <li key={t.key} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{t.label}</p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{t.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => togglePref(t.key)}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                    enabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}