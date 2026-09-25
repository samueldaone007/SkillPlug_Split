import { useState } from 'react'
import api from '../api/client'
import { useToast } from './Toast'
import { getErrorMessage } from '../utils/format'

export default function ReportButton({ targetType, targetId, className = '' }) {
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!reason.trim()) {
      showToast('Please describe the problem.', 'warning')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/reports/', {
        target_type: targetType,
        target_id: targetId,
        reason: reason.trim(),
      })
      showToast('Report submitted. Our team will review it.', 'success')
      setOpen(false)
      setReason('')
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`btn-secondary !text-gray-500 !border-gray-300 hover:!text-red-600 hover:!border-red-300 dark:!border-gray-600 dark:!text-gray-400 ${className}`}
      >
        <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Report
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Report this {targetType}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Tell us what's wrong and our moderation team will review it.
            </p>
            <form onSubmit={submit} className="mt-4 space-y-4">
              <textarea
                className="input"
                rows="4"
                required
                placeholder="e.g. Fake identity, spam, or misleading content"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1 !bg-red-600 !border-red-600 hover:!bg-red-700" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}