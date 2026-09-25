import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import MobileNav from './components/MobileNav'
import Spinner from './components/Spinner'
import ErrorBoundary from './components/ErrorBoundary'


import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import ProfileCreate from './pages/ProfileCreate'
import ProfileEdit from './pages/ProfileEdit'
import FreelancerProfile from './pages/FreelancerProfile'
import Freelancers from './pages/Freelancers'
import SavedFreelancers from './pages/SavedFreelancers'
import Jobs from './pages/Jobs'
import JobDetail from './pages/JobDetail'
import JobForm from './pages/JobForm'
import MyJobs from './pages/MyJobs'
import MyApplications from './pages/MyApplications'
import PortfolioManage from './pages/PortfolioManage'
import PortfolioForm from './pages/PortfolioForm'
import ResetPassword from './pages/ResetPassword'
import ResetPasswordConfirm from './pages/ResetPasswordConfirm'
import AdminVerifications from './pages/AdminVerifications'
import AdminOverview from './pages/AdminOverview'
import AdminReports from './pages/AdminReports'
import Messages from './pages/Messages'
import Conversation from './pages/Conversation'
import NotificationsPage from './pages/NotificationsPage'
import Settings from './pages/Settings'
import Reports from './pages/Reports'
import NotFound from './pages/NotFound'

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

function PublicOnlyRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children
}

function App() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pb-20 md:pb-8">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route path="/signup" element={<PublicOnlyRoute><Signup /></PublicOnlyRoute>} />
            <Route path="/reset-password" element={<PublicOnlyRoute><ResetPassword /></PublicOnlyRoute>} />
            <Route path="/reset-password/confirm/:uid/:token" element={<PublicOnlyRoute><ResetPasswordConfirm /></PublicOnlyRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/profile/create" element={<ProtectedRoute><ProfileCreate /></ProtectedRoute>} />
            <Route path="/profile/edit" element={<ProtectedRoute><ProfileEdit /></ProtectedRoute>} />
            <Route path="/u/:username" element={<FreelancerProfile />} />
            <Route path="/freelancers" element={<Freelancers />} />
            <Route path="/saved" element={<ProtectedRoute><SavedFreelancers /></ProtectedRoute>} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/jobs/post" element={<ProtectedRoute><JobForm /></ProtectedRoute>} />
            <Route path="/jobs/:id/edit" element={<ProtectedRoute><JobForm /></ProtectedRoute>} />
            <Route path="/my-jobs" element={<ProtectedRoute><MyJobs /></ProtectedRoute>} />
            <Route path="/my-applications" element={<ProtectedRoute><MyApplications /></ProtectedRoute>} />
            <Route path="/portfolio" element={<ProtectedRoute><PortfolioManage /></ProtectedRoute>} />
            <Route path="/portfolio/add" element={<ProtectedRoute><PortfolioForm /></ProtectedRoute>} />
            <Route path="/portfolio/:id/edit" element={<ProtectedRoute><PortfolioForm edit /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/messages/:id" element={<ProtectedRoute><Conversation /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/admin/verifications" element={<AdminRoute><AdminVerifications /></AdminRoute>} />
            <Route path="/admin/overview" element={<AdminRoute><AdminOverview /></AdminRoute>} />
            <Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </main>
      <Footer />
      <MobileNav />
    </div>
  )
}

export default App