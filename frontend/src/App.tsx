import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HomePage from './pages/HomePage'
import PredictionsPage from './pages/PredictionsPage'
import RankingsPage from './pages/RankingsPage'
import PlayersPage from './pages/PlayersPage'
import AccountPage from './pages/AccountPage'
import AdminPage from './pages/AdminPage'
import NewsPage from './pages/NewsPage'

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Router future={{ v7_startTransition: true }}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/predictions" element={<PredictionsPage />} />
            <Route path="/rankings" element={<RankingsPage />} />
            <Route path="/players" element={<PlayersPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

// Protected route wrapper
function ProtectedRoute() {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default App
