import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { authAPI, adminAPI } from './services/api'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import PredictionsPage from './pages/PredictionsPage'
import RankingsPage from './pages/RankingsPage'
import PlayersPage from './pages/PlayersPage'
import AccountPage from './pages/AccountPage'
import AdminPage from './pages/AdminPage'
import NewsPage from './pages/NewsPage'

function App() {
  const { setUser, setInitialized, setSystemDateOverride } = useAuthStore()

  useEffect(() => {
    authAPI.getCurrentUser()
      .then((res) => {
        setUser(res.data)
        // Fetch datetime override for all logged-in users (shown in header when active)
        adminAPI.getDatetimeOverride()
          .then(r => setSystemDateOverride(r.data.override ?? null))
          .catch(() => {})
      })
      .catch(() => setUser(null))
      .finally(() => setInitialized())
  }, [])

  return (
    <Router future={{ v7_startTransition: true }}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/reset-password" element={<ForgotPasswordPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/predictions" replace />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/predictions" element={<PredictionsPage />} />
            <Route path="/rankings" element={<RankingsPage />} />
            <Route path="/players" element={<PlayersPage />} />
            <Route path="/account" element={<AccountPage />} />
            {/* Admin-only routes */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>
          </Route>
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/predictions" replace />} />
      </Routes>
    </Router>
  )
}

// Protected route wrapper — waits for session check before deciding
function ProtectedRoute() {
  const { isAuthenticated, isInitializing } = useAuthStore()

  if (isInitializing) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

// Admin/Cashier route wrapper — only players (non-cashier, non-admin) are redirected
function AdminRoute() {
  const { user } = useAuthStore()

  if (!user?.is_admin && !user?.is_cachier) {
    return <Navigate to="/predictions" replace />
  }

  return <Outlet />
}

export default App
