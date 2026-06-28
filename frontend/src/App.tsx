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
import RulesPage from './pages/RulesPage'
import PrizesPage from './pages/PrizesPage'
import KnockoutPage from './pages/KnockoutPage'

function App() {
  const { setUser, setInitialized, setDatetimeOffset } = useAuthStore()

  useEffect(() => {
    authAPI.getCurrentUser()
      .then((res) => {
        setUser(res.data)
        // Fetch datetime offset for all logged-in users (shown in header when active)
        adminAPI.getDatetimeOverride()
          .then(r => setDatetimeOffset(r.data.offset_seconds != null ? r.data.offset_seconds * 1000 : null))
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

        {/* Public routes with layout */}
        <Route element={<Layout />}>
          <Route path="/rules" element={<RulesPage />} />
        </Route>

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/predictions" replace />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/predictions" element={<PredictionsPage />} />
            <Route path="/rankings" element={<RankingsPage />} />
            <Route path="/players" element={<PlayersPage />} />
            {/* Admin/Cashier-only routes */}
            <Route element={<AdminRoute />}>
              <Route path="/knockout" element={<KnockoutPage />} />
            </Route>
            <Route path="/prizes" element={<PrizesPage />} />
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
