import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { authAPI } from '../services/api'

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await authAPI.logout()
      logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <div className="app-layout">
      <header className="header">
        <div className="container">
          <h1 className="logo">⚽ ZGoogies</h1>
          <nav className="nav">
            <Link to="/predictions">Predictions</Link>
            <Link to="/rankings">Rankings</Link>
            <Link to="/news">News</Link>
            <Link to="/players">Players</Link>
            <Link to="/account">My Account</Link>
            {(user?.is_admin || user?.is_cachier) && <Link to="/admin">Admin</Link>}
          </nav>
          <div className="user-info">
            <span>Welcome, {user?.first_name}!</span>
            <button onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="container">
          <Outlet />
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <p>&copy; 2026 ZGoogies &mdash; FIFA World Cup 2026 Prediction Game</p>
        </div>
      </footer>
    </div>
  )
}
