import { useState, useEffect } from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { authAPI } from '../services/api'
import { usePullToRefresh } from '../hooks/usePullToRefresh'

const WC_START = new Date('2026-06-11T18:00:00Z')

function formatSimulated(offsetMs: number) {
  const d = new Date(Date.now() + offsetMs)
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
  }) + ' UTC'
}

type Countdown = { days: number; hours: number; minutes: number; seconds: number }

function calcCountdown(offsetMs: number): Countdown | null {
  const diff = WC_START.getTime() - (Date.now() + offsetMs)
  if (diff <= 0) return null
  const totalSec = Math.floor(diff / 1000)
  return {
    days:    Math.floor(totalSec / 86400),
    hours:   Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  }
}

export default function Layout() {
  const { user, logout, datetimeOffsetMs } = useAuthStore()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [countdown, setCountdown] = useState<Countdown | null>(() =>
    calcCountdown(datetimeOffsetMs ?? 0)
  )
  const { isPulling, pullDistance, isRefreshing, threshold } = usePullToRefresh()

  useEffect(() => {
    const tick = () => setCountdown(calcCountdown(datetimeOffsetMs ?? 0))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [datetimeOffsetMs])

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [menuOpen])

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
      {(isPulling || isRefreshing) && (
        <div className="pull-indicator">
          {isRefreshing ? 'Refreshing…' : pullDistance >= threshold ? 'Release to refresh' : 'Pull down to refresh'}
        </div>
      )}
      <header className="header">
        <div className="container">
          <div className="logo-wrapper">
            <Link to="/predictions" className="logo-link"><h1 className="logo">ZG⚽⚽gies</h1></Link>
            {datetimeOffsetMs != null && (
              <div className="datetime-override-notice mobile-only">
                ⏱ Simulated: {formatSimulated(datetimeOffsetMs)}
              </div>
            )}
          </div>

          {/* Hamburger button — visible on mobile only via CSS, only when logged in */}
          {user && (
            <button
              className={`hamburger-btn${menuOpen ? ' open' : ''}`}
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Toggle navigation"
            >
              <span /><span /><span />
            </button>
          )}

          {/* Desktop nav — full nav when logged in, just Log in link when not */}
          {user ? (
            <nav className="nav">
              <Link to="/predictions">Predictions</Link>
              <Link to="/rankings">Rankings</Link>
              <Link to="/news">News</Link>
              <Link to="/players">Players</Link>
              <Link to="/prizes">Prizes</Link>
              <Link to="/rules">Rules</Link>
              <Link to="/account">My Account</Link>
              {(user.is_admin || user.is_cachier) && <Link to="/admin">Admin</Link>}
            </nav>
          ) : (
            <nav className="nav">
              <Link to="/login">Log in</Link>
            </nav>
          )}

          {/* Mobile nav overlay */}
          {menuOpen && (
            <div className="mobile-nav-overlay" onClick={() => setMenuOpen(false)}>
              <nav className="mobile-nav" onClick={e => e.stopPropagation()}>
                <div className="mobile-nav-header">
                  {user && <span className="mobile-nav-username">Welcome, {user.first_name}!</span>}
                  <button className="mobile-nav-close" onClick={() => setMenuOpen(false)}>✕</button>
                </div>
                <Link to="/predictions" onClick={() => setMenuOpen(false)}>Predictions</Link>
                <Link to="/rankings" onClick={() => setMenuOpen(false)}>Rankings</Link>
                <Link to="/news" onClick={() => setMenuOpen(false)}>News</Link>
                <Link to="/players" onClick={() => setMenuOpen(false)}>Players</Link>
                <Link to="/prizes" onClick={() => setMenuOpen(false)}>Prizes</Link>
                <Link to="/rules" onClick={() => setMenuOpen(false)}>Rules</Link>
                <Link to="/account" onClick={() => setMenuOpen(false)}>My Account</Link>
                {(user?.is_admin || user?.is_cachier) &&
                  <Link to="/admin" onClick={() => setMenuOpen(false)}>Admin</Link>}
                {user && (
                  <button className="mobile-nav-logout" onClick={() => { setMenuOpen(false); handleLogout() }}>
                    Logout
                  </button>
                )}
              </nav>
            </div>
          )}

          {user && (
            <div className="user-info">
              <div>
                <span>Welcome, {user.first_name}!</span>
                {datetimeOffsetMs != null && (
                  <div className="datetime-override-notice">
                    ⏱ Simulated: {formatSimulated(datetimeOffsetMs)}
                  </div>
                )}
              </div>
              <button onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>
        {countdown !== null && (
          <div className="wc-countdown-banner">
            ⚽&nbsp;
            <span className="wc-countdown-timer">
              {countdown.days}d {String(countdown.hours).padStart(2, '0')}h {String(countdown.minutes).padStart(2, '0')}m {String(countdown.seconds).padStart(2, '0')}s
            </span>
            &nbsp;to kick off
          </div>
        )}
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
