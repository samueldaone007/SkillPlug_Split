export default function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse rounded-2xl border border-gray-100 bg-gray-100 dark:border-gray-700 dark:bg-gray-800 ${className}`} />
  )
}