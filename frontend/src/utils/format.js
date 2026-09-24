export function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-NG', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatRelativeTime(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const minutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  if (weeks < 4) return `${weeks}w ago`
  if (months < 12) return `${months}mo ago`
  return formatDate(dateString)
}

export function formatNaira(amount) {
  if (amount === null || amount === undefined) return ''
  return `₦${Number(amount).toLocaleString('en-NG')}`
}

export function getInitials(name = '') {
  if (!name) return 'SP'
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function getErrorMessage(error) {
  if (error.response?.data?.detail) return error.response.data.detail
  if (error.response?.data?.error) return error.response.data.error
  if (error.response?.data) {
    const key = Object.keys(error.response.data)[0]
    const value = error.response.data[key]
    if (Array.isArray(value)) return value[0]
    if (typeof value === 'string') return value
    return 'An error occurred'
  }
  if (error.message) return error.message
  return 'Something went wrong. Please try again.'
}

export function getProfileImageUrl(path) {
  if (!path) return ''
  if (path.startsWith('http')) return path
  const base = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || ''
  return `${base}${path}`
}

export function getMediaUrl(path) {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return path
}