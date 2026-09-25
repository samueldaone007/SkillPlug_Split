import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import Spinner from '../components/Spinner'
import ImageLightbox from '../components/ImageLightbox'
import ShareButton from '../components/ShareButton'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { getErrorMessage } from '../utils/format'

export default function PortfolioManage() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(null)
  const navigate = useNavigate()
  const { showToast } = useToast()

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await api.get('/portfolio/')
        if (!cancelled) setItems(data.results || data)
      } catch (err) {
        showToast(getErrorMessage(err), 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this portfolio item?')) return
    try {
      await api.delete(`/portfolio/${id}/`)
      setItems((prev) => prev.filter((item) => item.id !== id))
      showToast('Portfolio item deleted.', 'success')
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Portfolio</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Showcase your best work to potential clients.
          </p>
        </div>
        <Link to="/portfolio/add" className="btn-primary">Add Item</Link>
      </div>

      {items.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            You haven't added any portfolio items yet.
          </p>
          <Link to="/portfolio/add" className="btn-primary mt-4">Add Your First Item</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="card overflow-hidden">
              {item.image && (
                <button
                  type="button"
                  onClick={() => setLightbox(item.image)}
                  className="block w-full cursor-zoom-in"
                  aria-label={`View ${item.title} image`}
                >
                  <img src={item.image} alt={item.title} loading="lazy" className="h-40 w-full object-cover" />
                </button>
              )}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                {item.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                )}
                {item.project_url && (
                  <a href={item.project_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400">
                    View project →
                  </a>
                )}
                <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                  <Link to={`/portfolio/${item.id}/edit`} className="btn-secondary text-xs !py-1.5">
                    Edit
                  </Link>
                  <button type="button" onClick={() => handleDelete(item.id)} className="btn-danger text-xs !py-1.5">
                    Delete
                  </button>
                  <ShareButton
                    path={`/u/${user?.username}?item=${item.id}`}
                    label=""
                    className="ml-auto rounded-lg p-2 text-xs text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 text-center">
        <Link to="/dashboard" className="text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400">
          ← Back to Dashboard
        </Link>
      </p>

      <ImageLightbox src={lightbox} alt="Portfolio image" onClose={() => setLightbox(null)} />
    </div>
  )
}