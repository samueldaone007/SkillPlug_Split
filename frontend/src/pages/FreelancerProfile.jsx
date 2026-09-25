import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import Spinner from '../components/Spinner'
import StarRating from '../components/StarRating'
import SaveButton from '../components/SaveButton'
import ReportButton from '../components/ReportButton'
import { getErrorMessage, getProfileImageUrl, getInitials, formatRelativeTime } from '../utils/format'

export default function FreelancerProfile() {
  const { username } = useParams()
  const { user: currentUser } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [freelancer, setFreelancer] = useState(null)
  const [portfolio, setPortfolio] = useState([])
  const [reviews, setReviews] = useState([])
  const [avgRating, setAvgRating] = useState(0)
  const [loading, setLoading] = useState(true)
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const [reviewing, setReviewing] = useState(false)
  const [hasReviewed, setHasReviewed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const load = async () => {
      try {
        const [profileRes, reviewsRes] = await Promise.all([
          api.get(`/users/${username}/`),
          api.get(`/reviews/${username}/`),
        ])
        if (cancelled) return
        setFreelancer(profileRes.data)
        const reviewsList = reviewsRes.data.results || reviewsRes.data
        setReviews(reviewsList)
        const total = reviewsList.length
        if (total > 0) {
          setAvgRating(round(sum(reviewsRes.data.map((r) => r.rating)) / total))
        }
        if (currentUser) {
          setHasReviewed(reviewsList.some((r) => r.reviewer?.username === currentUser.username))
        }
        const portRes = await api.get(`/users/${username}/portfolio/`).catch(() => ({ data: [] }))
        if (!cancelled) setPortfolio(portRes.data.results || portRes.data)
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [username, currentUser])

  const sum = (arr) => arr.reduce((a, b) => a + b, 0)
  const round = (n) => Math.round(n * 10) / 10

  const startChat = async () => {
    try {
      const { data } = await api.post(`/conversations/start/${username}/`)
      navigate(`/messages/${data.id}`)
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    }
  }

  const handleReviewSubmit = async (e) => {
    e.preventDefault()
    setReviewing(true)
    try {
      await api.post(`/reviews/${username}/create/`, reviewForm)
      showToast('Review submitted successfully!', 'success')
      setReviewForm({ rating: 5, comment: '' })
      const reviewsRes = await api.get(`/reviews/${username}/`)
      const reviewsList = reviewsRes.data.results || reviewsRes.data
      setReviews(reviewsList)
      setHasReviewed(true)
      const total = reviewsList.length
      if (total > 0) {
        setAvgRating(round(reviewsRes.data.reduce((a, r) => a + r.rating, 0) / total))
      }
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    } finally {
      setReviewing(false)
    }
  }

  if (loading) return <Spinner />
  if (!freelancer) return <div className="py-16 text-center text-gray-500">Freelancer not found.</div>

  const isOwnProfile = currentUser?.username === freelancer.username
  const isClient = currentUser && !currentUser.is_student
  const canReview = currentUser && !isOwnProfile && !hasReviewed

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Profile header */}
      <div className="card overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-primary-500 to-primary-700" />
        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              {freelancer.profile_image ? (
                <img
                  src={getProfileImageUrl(freelancer.profile_image)}
                  alt={freelancer.display_name}
                  className="h-24 w-24 rounded-full border-4 border-white object-cover dark:border-gray-800"
                />
              ) : (
                <span className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-primary-400 to-primary-600 text-2xl font-bold text-white dark:border-gray-800">
                  {getInitials(freelancer.display_name)}
                </span>
              )}
              <div className="pb-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">{freelancer.display_name}</h1>
                  {freelancer.verified && (
                    <span className="badge-green">
                      <svg className="mr-0.5 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                      Verified
                    </span>
                  )}
                </div>
                {freelancer.school_display && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{freelancer.school_display}</p>
                )}
                {freelancer.department && (
                  <p className="text-sm text-gray-400 dark:text-gray-500">{freelancer.department}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 pb-8 sm:pb-0">
              {!isOwnProfile && <SaveButton freelancer={freelancer} />}
              {currentUser && !isOwnProfile && (
                <button type="button" onClick={startChat} className="btn-primary">
                  <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  Message
                </button>
              )}
              {currentUser && !isOwnProfile && (
                <ReportButton targetType="profile" targetId={freelancer.id} />
              )}
              {freelancer.whatsapp_link && (
                <a
                  href={freelancer.whatsapp_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary !bg-green-600 hover:!bg-green-700"
                >
                  <svg className="mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </a>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <StarRating rating={avgRating} showValue />
            <span className="text-sm text-gray-500">{reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</span>
            <span className={`badge ${
              freelancer.availability_status === 'available' ? 'badge-green' :
              freelancer.availability_status === 'busy' ? 'badge-yellow' : 'badge-gray'
            }`}>
              {freelancer.availability_status === 'available' ? 'Available for Work' :
               freelancer.availability_status === 'busy' ? 'Currently Busy' : 'Not Available'}
            </span>
            <span className="badge-gray">{freelancer.portfolio_count} portfolio items</span>
          </div>

          {freelancer.skills?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {freelancer.skills.map((skill) => (
                <Link key={skill.id} to={`/freelancers?skill=${encodeURIComponent(skill.name)}`} className="badge badge-primary px-3 py-1.5 hover:bg-primary-200 dark:hover:bg-primary-800">
                  {skill.icon && <span className="mr-1">{skill.icon}</span>}
                  {skill.name}
                </Link>
              ))}
            </div>
          )}

          {freelancer.bio && (
            <p className="mt-4 whitespace-pre-wrap text-gray-600 dark:text-gray-300">{freelancer.bio}</p>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Portfolio */}
        <section className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Portfolio</h2>
          {portfolio.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No portfolio items yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {portfolio.map((item) => (
                <div key={item.id} className="card overflow-hidden">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-40 w-full object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                    {item.description && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{item.description}</p>
                    )}
                    {item.project_url && (
                      <a href={item.project_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400">
                        View project →
                      </a>
                    )}
                    <p className="mt-2 text-xs text-gray-400">{formatRelativeTime(item.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isOwnProfile && (
            <Link to="/portfolio" className="btn-secondary mt-4">Manage Portfolio</Link>
          )}
        </section>

        {/* Reviews */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Reviews</h2>
            <StarRating rating={avgRating} showValue />
          </div>

          {canReview && (
            <div className="card mb-4 p-5">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Leave a Review</h3>
              <form onSubmit={handleReviewSubmit} className="space-y-3">
                <div>
                  <StarRating
                    rating={reviewForm.rating}
                    size="lg"
                    interactive
                    onChange={(rating) => setReviewForm({ ...reviewForm, rating })}
                  />
                </div>
                <textarea
                  className="input"
                  rows="3"
                  placeholder="Share your experience working with this freelancer..."
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                />
                <button type="submit" className="btn-primary w-full" disabled={reviewing}>
                  {reviewing ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            </div>
          )}

          {hasReviewed && (
            <div className="card mb-4 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">You have already reviewed this freelancer.</p>
            </div>
          )}

          {reviews.length === 0 && !canReview ? (
            <div className="card p-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No reviews yet. Be the first!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="card p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-900 dark:text-primary-200">
                      {getInitials(review.reviewer_name)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{review.reviewer_name}</p>
                      <StarRating rating={review.rating} size="sm" />
                    </div>
                    <span className="ml-auto text-xs text-gray-400">{formatRelativeTime(review.created_at)}</span>
                  </div>
                  {review.comment && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}