import { useState, useEffect, useCallback } from 'react'
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

type Tab = 'profile' | 'password' | 'ai'

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

  // AI Assistant state
  const [apiToken, setApiToken] = useState<string | null>(null)
  const [tokenVisible, setTokenVisible] = useState(false)
  const [tokenLoading, setTokenLoading] = useState(false)
  const [tokenMsg, setTokenMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [regenerating, setRegenerating] = useState(false)

  const loadToken = useCallback(async () => {
    setTokenLoading(true)
    try {
      const res = await authAPI.getApiToken()
      setApiToken(res.data.token)
    } catch {
      setTokenMsg({ type: 'error', text: 'Failed to load token.' })
    } finally {
      setTokenLoading(false)
    }
  }, [])

  const handleRegenerateToken = async () => {
    if (!confirm('Regenerate your API token? The old token will stop working immediately.')) return
    setRegenerating(true)
    setTokenMsg(null)
    try {
      const res = await authAPI.regenerateApiToken()
      setApiToken(res.data.token)
      setTokenVisible(true)
      setTokenMsg({ type: 'success', text: 'Token regenerated. Update your AI assistant connection.' })
    } catch {
      setTokenMsg({ type: 'error', text: 'Failed to regenerate token.' })
    } finally {
      setRegenerating(false)
    }
  }

  const handleCopyToken = async () => {
    if (!apiToken) return
    try {
      await navigator.clipboard.writeText(apiToken)
      setTokenMsg({ type: 'success', text: 'Token copied to clipboard.' })
    } catch {
      setTokenMsg({ type: 'error', text: 'Copy failed — please select and copy the token manually.' })
    }
  }

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
        <button
          className={`tab-btn${tab === 'ai' ? ' active' : ''}`}
          onClick={() => { setTab('ai'); if (!apiToken) loadToken() }}
        >
          AI Assistant
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

      {tab === 'ai' && (
        <section className="account-section">
          <h3 className="account-section-title">AI Assistant</h3>
          <p className="account-help-text">
            Connect your personal ZGoogies token to an AI assistant (Claude.ai or Google AI Studio)
            to view your predictions, check rankings, and submit bets via natural conversation.
          </p>

          {tokenLoading && <p className="loading-text">Loading token...</p>}

          {!tokenLoading && apiToken && (
            <div className="ai-token-block">
              <label className="account-label">Your API token</label>
              <div className="ai-token-row">
                <input
                  type={tokenVisible ? 'text' : 'password'}
                  className="ai-token-input"
                  value={apiToken}
                  readOnly
                />
                <button
                  type="button"
                  className="account-save-btn"
                  onClick={() => setTokenVisible((v) => !v)}
                >
                  {tokenVisible ? 'Hide' : 'Reveal'}
                </button>
                <button
                  type="button"
                  className="account-save-btn"
                  onClick={handleCopyToken}
                >
                  Copy
                </button>
              </div>

              <button
                type="button"
                className="account-save-btn account-save-btn--secondary"
                onClick={handleRegenerateToken}
                disabled={regenerating}
                style={{ marginTop: '0.75rem' }}
              >
                {regenerating ? 'Regenerating...' : 'Regenerate token'}
              </button>

              {tokenMsg && (
                <p className={tokenMsg.type === 'success' ? 'account-success-msg' : 'error'} style={{ marginTop: '0.5rem' }}>
                  {tokenMsg.text}
                </p>
              )}
            </div>
          )}

          <div className="ai-setup-guide">
            <h4>How to connect</h4>
            <div className="ai-setup-option">
              <strong>Option A — Google AI Studio (free)</strong>
              <ol>
                <li>Go to <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer">aistudio.google.com</a> and sign in with a Google account</li>
                <li>Click <em>Build</em> → <em>Create agent</em></li>
                <li>Add MCP server URL: <code>https://zgoogies.online/api/mcp</code></li>
                <li>Paste the system prompt (ask your admin for it)</li>
                <li>Share the agent link with other players</li>
              </ol>
            </div>
            <div className="ai-setup-option">
              <strong>Option B — Claude.ai (Claude Pro required)</strong>
              <ol>
                <li>Go to <a href="https://claude.ai/" target="_blank" rel="noreferrer">claude.ai</a> → Settings → Integrations</li>
                <li>Add MCP server: <code>https://zgoogies.online/api/mcp</code></li>
                <li>Create a Project with the ZGoogies system prompt as instructions</li>
                <li>The Project will use your token automatically when you chat</li>
              </ol>
            </div>
            <p className="account-help-text" style={{ marginTop: '0.75rem' }}>
              When the AI assistant asks for your token, paste it from above.
              Your token gives the AI access to your ZGoogies data only — it cannot change your password or account settings.
            </p>
          </div>
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
