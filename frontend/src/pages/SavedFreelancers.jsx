import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import FreelancerCard from '../components/FreelancerCard'
import Spinner from '../components/Spinner'
import { getErrorMessage } from '../utils/format'
import { useToast } from '../components/Toast'

export default function SavedFreelancers() {
  const [freelancers, setFreelancers] = useState([])
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState({})
  const [savingNoteId, setSavingNoteId] = useState(null)
  const { showToast } = useToast()

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await api.get('/users/saved/')
        const list = data.results || data
        if (!cancelled) {
          setFreelancers(list)
          setNotes(Object.fromEntries(list.map((f) => [f.id, f.note || ''])))
        }
      } catch (err) {
        showToast(getErrorMessage(err), 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const saveNote = async (freelancer) => {
    setSavingNoteId(freelancer.id)
    try {
      await api.put(`/users/${freelancer.username}/note/`, { note: notes[freelancer.id] || '' })
      showToast('Note saved.', 'success')
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    } finally {
      setSavingNoteId(null)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Saved Freelancers</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Freelancers you've bookmarked for later.
        </p>
      </div>

      {freelancers.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-gray-500 dark:text-gray-400">You haven't saved any freelancers yet.</p>
          <Link to="/freelancers" className="btn-primary mt-4">Browse Freelancers</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {freelancers.map((freelancer) => (
            <div key={freelancer.id} className="flex flex-col gap-2">
              <FreelancerCard freelancer={freelancer} />
              <div className="rounded-xl border border-dashed border-gray-300 p-3 dark:border-gray-600">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Private note</label>
                <textarea
                  className="input mt-1 !py-1.5 text-sm"
                  rows="2"
                  placeholder="Only you can see this..."
                  value={notes[freelancer.id] || ''}
                  onChange={(e) => setNotes((p) => ({ ...p, [freelancer.id]: e.target.value }))}
                />
                <button
                  type="button"
                  className="mt-2 w-full rounded-lg border border-primary-300 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100 dark:border-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                  disabled={savingNoteId === freelancer.id}
                  onClick={() => saveNote(freelancer)}
                >
                  {savingNoteId === freelancer.id ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}