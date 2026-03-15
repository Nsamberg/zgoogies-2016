import { useState, useEffect } from 'react'
import { authAPI, teamsAPI } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import { Team } from '../types'

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/London', label: 'UK / Ireland / Portugal - GMT/BST (Europe/London)' },
  { value: 'Europe/Paris', label: 'Central Europe - CET (Europe/Paris)' },
  { value: 'Europe/Athens', label: 'Eastern Europe - EET (Europe/Athens)' },
  { value: 'Asia/Kolkata', label: 'India (Asia/Kolkata)' },
  { value: 'America/New_York', label: 'US / Canada Eastern (America/New_York)' },
  { value: 'America/Chicago', label: 'US Central (America/Chicago)' },
  { value: 'America/Denver', label: 'US Mountain (America/Denver)' },
  { value: 'America/Los_Angeles', label: 'US / Canada Pacific (America/Los_Angeles)' },
  { value: 'America/Anchorage', label: 'US Alaska (America/Anchorage)' },
  { value: 'Pacific/Honolulu', label: 'US Hawaii (Pacific/Honolulu)' },
  { value: 'Africa/Cairo', label: 'Cairo (Africa/Cairo)' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (Africa/Johannesburg)' },
  { value: 'Africa/Lagos', label: 'Lagos (Africa/Lagos)' },
  { value: 'Africa/Nairobi', label: 'Nairobi (Africa/Nairobi)' },
  { value: 'America/Mexico_City', label: 'Mexico City (America/Mexico_City)' },
  { value: 'America/Bogota', label: 'Bogota (America/Bogota)' },
  { value: 'America/Lima', label: 'Lima (America/Lima)' },
  { value: 'America/Santiago', label: 'Santiago (America/Santiago)' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (America/Buenos_Aires)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (America/Sao_Paulo)' },
  { value: 'Asia/Dubai', label: 'Dubai (Asia/Dubai)' },
  { value: 'Asia/Riyadh', label: 'Riyadh (Asia/Riyadh)' },
  { value: 'Asia/Tehran', label: 'Tehran (Asia/Tehran)' },
  { value: 'Asia/Dhaka', label: 'Dhaka (Asia/Dhaka)' },
  { value: 'Asia/Bangkok', label: 'Bangkok (Asia/Bangkok)' },
  { value: 'Asia/Singapore', label: 'Singapore (Asia/Singapore)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (Asia/Hong_Kong)' },
  { value: 'Asia/Shanghai', label: 'Beijing/Shanghai (Asia/Shanghai)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (Asia/Tokyo)' },
  { value: 'Asia/Seoul', label: 'Seoul (Asia/Seoul)' },
  { value: 'Asia/Jakarta', label: 'Jakarta (Asia/Jakarta)' },
  { value: 'Asia/Manila', label: 'Manila (Asia/Manila)' },
  { value: 'Asia/Karachi', label: 'Karachi (Asia/Karachi)' },
  { value: 'Asia/Istanbul', label: 'Istanbul (Asia/Istanbul)' },
  { value: 'Australia/Sydney', label: 'Sydney (Australia/Sydney)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (Australia/Melbourne)' },
  { value: 'Australia/Brisbane', label: 'Brisbane (Australia/Brisbane)' },
  { value: 'Australia/Perth', label: 'Perth (Australia/Perth)' },
  { value: 'Pacific/Auckland', label: 'Auckland (Pacific/Auckland)' },
  { value: 'Pacific/Fiji', label: 'Fiji (Pacific/Fiji)' },
  { value: 'Europe/Moscow', label: 'Moscow (Europe/Moscow)' },
]

const isPlaceholderTeam = (name: string): boolean =>
  /^[WL]\d+[A-Z]*$/i.test(name) ||
  /^\d+[A-Z]+$/i.test(name) ||
  /^[A-Z]+\d+$/i.test(name) ||
  /^UEFA\s*\S+/i.test(name) ||
  /^runner[- ]?up/i.test(name) ||
  /^winner\s+of/i.test(name) ||
  /^\d+(st|nd|rd|th)\s+place/i.test(name) ||
  /^loser\s+of/i.test(name)

interface AccountData {
  username: string
  first_name: string
  surname: string
  email: string
  timezone: string
  is_admin: boolean
  is_cachier: boolean
  has_paid: boolean
  tournament_winner_id: number | null
  tournament_winner_locked: boolean
}

type Tab = 'profile' | 'password'

export default function AccountPage() {
  const { setUser } = useAuthStore()

  const [account, setAccount] = useState<AccountData | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('profile')

  // Profile form state
  const [firstName, setFirstName] = useState('')
  const [surname, setSurname] = useState('')
  const [email, setEmail] = useState('')
  const [timezone, setTimezone] = useState('')
  const [winnerId, setWinnerId] = useState<string>('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Password form state
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    Promise.all([authAPI.getCurrentUser(), teamsAPI.getAll()])
      .then(([userRes, teamsRes]) => {
        const u: AccountData = userRes.data
        setAccount(u)
        setFirstName(u.first_name)
        setSurname(u.surname)
        setEmail(u.email)
        setTimezone(u.timezone)
        setWinnerId(u.tournament_winner_id ? String(u.tournament_winner_id) : '')
        setTeams(teamsRes.data)
      })
      .catch(() => setError('Failed to load account data. Please refresh.'))
      .finally(() => setLoading(false))
  }, [])

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSaving(true)
    setProfileMsg(null)
    try {
      await authAPI.updateProfile({
        first_name: firstName,
        surname,
        email,
        timezone,
        tournament_winner_id: winnerId ? parseInt(winnerId) : null,
      })
      setAccount((prev) => prev
        ? { ...prev, first_name: firstName, surname, email, timezone, tournament_winner_id: winnerId ? parseInt(winnerId) : null }
        : prev)
      const refreshed = await authAPI.getCurrentUser()
      setUser(refreshed.data)
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' })
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update profile.' })
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwMsg(null)
    if (newPw !== confirmPw) {
      setPwMsg({ type: 'error', text: 'New passwords do not match.' })
      return
    }
    setPwSaving(true)
    try {
      await authAPI.changePassword(currentPw, newPw)
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      setPwMsg({ type: 'success', text: 'Password changed successfully.' })
    } catch (err: any) {
      setPwMsg({ type: 'error', text: err.response?.data?.error || 'Failed to change password.' })
    } finally {
      setPwSaving(false)
    }
  }

  if (loading) return <p className="loading-text">Loading account...</p>
  if (error) return <p className="error">{error}</p>
  if (!account) return null

  const role = account.is_admin ? 'Admin' : account.is_cachier ? 'Cashier' : 'Player'

  return (
    <div className="account-page">
      <h2 className="page-title">My Account</h2>

      <div className="page-tabs">
        <button
          className={`tab-btn${tab === 'profile' ? ' active' : ''}`}
          onClick={() => setTab('profile')}
        >
          Profile
        </button>
        <button
          className={`tab-btn${tab === 'password' ? ' active' : ''}`}
          onClick={() => setTab('password')}
        >
          Change Password
        </button>
      </div>

      {tab === 'profile' && (
        <section className="account-section">
          {/* Read-only info */}
          <div className="account-readonly-grid">
            <div className="account-field">
              <span className="account-label">Username</span>
              <span className="account-value">{account.username}</span>
            </div>
            <div className="account-field">
              <span className="account-label">Role</span>
              <span className="account-value">{role}</span>
            </div>
            <div className="account-field">
              <span className="account-label">Payment</span>
              <span className={`account-value ${account.has_paid ? 'text-success' : 'text-warning'}`}>
                {account.has_paid ? 'Confirmed' : 'Not yet received'}
              </span>
            </div>
          </div>

          <form onSubmit={handleProfileSave} className="account-form">
            <div className="form-row">
              <div className="form-group">
                <label>First name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Surname</label>
                <input
                  type="text"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Timezone</label>
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)} required>
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Tournament Winner Prediction</label>
              {account.tournament_winner_locked ? (
                <div className="account-locked">
                  <span>{teams.find((t) => t.id === account.tournament_winner_id)?.name ?? '—'}</span>
                  <span className="locked-note">Locked — tournament has started</span>
                </div>
              ) : (
                <>
                  <select value={winnerId} onChange={(e) => setWinnerId(e.target.value)}>
                    <option value="">-- No prediction --</option>
                    {teams.filter((t) => !isPlaceholderTeam(t.name)).map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                    ))}
                  </select>
                  <small className="form-help">Can be changed until the tournament starts</small>
                </>
              )}
            </div>

            {profileMsg && (
              <p className={profileMsg.type === 'success' ? 'account-success-msg' : 'error'}>
                {profileMsg.text}
              </p>
            )}

            <button type="submit" className="account-save-btn" disabled={profileSaving}>
              {profileSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </section>
      )}

      {tab === 'password' && (
        <section className="account-section">
          <form onSubmit={handlePasswordSave} className="account-form">
            <div className="form-group">
              <label>Current password</label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="form-group">
              <label>New password</label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label>Confirm new password</label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            {pwMsg && (
              <p className={pwMsg.type === 'success' ? 'account-success-msg' : 'error'}>
                {pwMsg.text}
              </p>
            )}

            <button type="submit" className="account-save-btn" disabled={pwSaving}>
              {pwSaving ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </section>
      )}
    </div>
  )
}
