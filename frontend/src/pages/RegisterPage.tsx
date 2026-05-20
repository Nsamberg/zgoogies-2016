import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import ReCAPTCHA from 'react-google-recaptcha'
import { authAPI, teamsAPI } from '../services/api'
import { Team } from '../types'

const RECAPTCHA_SITE_KEY = '6LcAMVwUAAAAADmWmG4kqXh68Dtc03tmXw_T5lcd'
const IS_PROD = import.meta.env.PROD

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  // === Most Common Timezones ===
  // UK / Ireland / Portugal (GMT/BST)
  { value: 'Europe/London', label: 'UK / Ireland / Portugal - GMT/BST (Europe/London)' },
  // Central European Time (CET/CEST) — covers France, Germany, Italy, Spain, Netherlands, Belgium, Austria, Switzerland, Poland, Sweden, Norway, etc.
  { value: 'Europe/Paris', label: 'Central Europe - CET (Europe/Paris)' },
  // Eastern European Time (EET/EEST) — covers Greece, Finland, etc.
  { value: 'Europe/Athens', label: 'Eastern Europe - EET (Europe/Athens)' },
  // India
  { value: 'Asia/Kolkata', label: 'India (Asia/Kolkata)' },
  // US Timezones
  { value: 'America/New_York', label: 'US / Canada Eastern (America/New_York)' },
  { value: 'America/Chicago', label: 'US Central (America/Chicago)' },
  { value: 'America/Denver', label: 'US Mountain (America/Denver)' },
  { value: 'America/Los_Angeles', label: 'US / Canada Pacific (America/Los_Angeles)' },
  { value: 'America/Anchorage', label: 'US Alaska (America/Anchorage)' },
  { value: 'Pacific/Honolulu', label: 'US Hawaii (Pacific/Honolulu)' },
  // === Other Timezones ===
  // Africa
  { value: 'Africa/Cairo', label: 'Cairo (Africa/Cairo)' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (Africa/Johannesburg)' },
  { value: 'Africa/Lagos', label: 'Lagos (Africa/Lagos)' },
  { value: 'Africa/Nairobi', label: 'Nairobi (Africa/Nairobi)' },
  // Americas (Other)
  { value: 'America/Mexico_City', label: 'Mexico City (America/Mexico_City)' },
  { value: 'America/Bogota', label: 'Bogota (America/Bogota)' },
  { value: 'America/Lima', label: 'Lima (America/Lima)' },
  { value: 'America/Santiago', label: 'Santiago (America/Santiago)' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (America/Buenos_Aires)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (America/Sao_Paulo)' },
  // Asia (Other)
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
  // Australia & Pacific
  { value: 'Australia/Sydney', label: 'Sydney (Australia/Sydney)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (Australia/Melbourne)' },
  { value: 'Australia/Brisbane', label: 'Brisbane (Australia/Brisbane)' },
  { value: 'Australia/Perth', label: 'Perth (Australia/Perth)' },
  { value: 'Pacific/Auckland', label: 'Auckland (Pacific/Auckland)' },
  { value: 'Pacific/Fiji', label: 'Fiji (Pacific/Fiji)' },
  // Europe (Other)
  { value: 'Europe/Moscow', label: 'Moscow (Europe/Moscow)' },
]

function getOffsetMinutes(tz: string): number {
  const now = new Date()
  const local = new Date(now.toLocaleString('en-US', { timeZone: tz }))
  const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }))
  return Math.round((local.getTime() - utc.getTime()) / 60000)
}

function detectTimezone(): string {
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (TIMEZONES.some(tz => tz.value === browserTz)) return browserTz
  try {
    const browserOffset = getOffsetMinutes(browserTz)
    const offsetMatch = TIMEZONES.find(tz => getOffsetMinutes(tz.value) === browserOffset)
    if (offsetMatch) return offsetMatch.value
  } catch {}
  return 'Europe/London'
}

// Placeholder team names follow patterns like "W77", "1A", "3ABCD", "UEFA 1", "UEFA A", etc.
const isPlaceholderTeam = (name: string): boolean => {
  return (
    /^[WL]\d+[A-Z]*$/i.test(name) ||   // W77, L23, W77A
    /^\d+[A-Z]+$/i.test(name) ||        // 1A, 2B, 3ABCD
    /^[A-Z]+\d+$/i.test(name) ||        // A1, B2, AB12
    /^UEFA\s*\S+/i.test(name) ||        // UEFA 1, UEFA A, UEFA anything
    /^runner[- ]?up/i.test(name) ||     // Runner-up Group A
    /^winner\s+of/i.test(name) ||       // Winner of Match X
    /^\d+(st|nd|rd|th)\s+place/i.test(name) || // 3rd place, 1st place
    /^loser\s+of/i.test(name)           // Loser of Match X
  )
}

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    surname: '',
    email: '',
    timezone: detectTimezone(),
    tournament_winner_id: '',
  })
  const [teams, setTeams] = useState<Team[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(30)
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null)
  const recaptchaRef = useRef<ReCAPTCHA>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchInitialData = async () => {
      const [teamsRes, statusRes] = await Promise.allSettled([
        teamsAPI.getAll(),
        authAPI.getRegistrationStatus(),
      ])
      if (teamsRes.status === 'fulfilled') setTeams(teamsRes.value.data)
      if (statusRes.status === 'fulfilled') setRegistrationOpen(statusRes.value.data.open)
    }
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (!success) return
    if (countdown <= 0) {
      navigate('/login')
      return
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [success, countdown, navigate])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const validateForm = () => {
    if (!formData.username.trim()) {
      setError('Username is required')
      return false
    }
    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters')
      return false
    }
    if (!formData.first_name.trim()) {
      setError('First name is required')
      return false
    }
    if (!formData.surname.trim()) {
      setError('Surname is required')
      return false
    }
    if (!formData.email.trim()) {
      setError('Email is required')
      return false
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address')
      return false
    }
    if (!formData.tournament_winner_id) {
      setError('Please select your tournament winner prediction')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) {
      return
    }

    const captchaToken = IS_PROD ? (recaptchaRef.current?.getValue() || '') : 'dev'
    if (IS_PROD && !captchaToken) {
      setError('Please complete the CAPTCHA.')
      return
    }

    setLoading(true)

    try {
      const registrationData = {
        ...formData,
        tournament_winner_id: parseInt(formData.tournament_winner_id),
        captcha_token: captchaToken,
      }
      const response = await authAPI.register(registrationData)
      setGeneratedPassword(response.data.password || '')
      setLoading(false)
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.')
      if (IS_PROD) recaptchaRef.current?.reset()
      setLoading(false)
    }
  }

  if (registrationOpen === false) {
    return (
      <div className="register-page">
        <div className="register-container">
          <h1>Registration Closed</h1>
          <div className="error">
            Registration is closed. The tournament has already started.
          </div>
          <div className="links">
            <Link to="/login">Already have an account? Login</Link>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="register-page">
        <div className="register-container">
          <h1>Registration Successful!</h1>
          <div className="success-message">
            <p>✅ Your account has been created successfully.</p>
            {generatedPassword && (
              <div className="generated-password-box">
                <p>Your password is:</p>
                <code className="generated-password">{generatedPassword}</code>
                <p className="password-note">Note it down — it has also been sent to <strong>{formData.email}</strong></p>
              </div>
            )}
            <p>Redirecting to login page in <strong>{countdown}</strong> second{countdown !== 1 ? 's' : ''}...</p>
          </div>
          <div className="links">
            <Link to="/login">Go to login now</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="register-page">
      <div className="register-container">
        <h1>Register for ZGoogies</h1>
        <p className="registration-info">
          Create your account to join the prediction game. A password will be sent to your email.
        </p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username *</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Choose a unique username"
              required
              minLength={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>First Name *</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="Your first name"
                required
              />
            </div>

            <div className="form-group">
              <label>Surname *</label>
              <input
                type="text"
                name="surname"
                value={formData.surname}
                onChange={handleChange}
                placeholder="Your surname"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your.email@example.com"
              required
            />
            <small className="form-help">Your password will be sent to this email</small>
          </div>

          <div className="form-group">
            <label>Timezone *</label>
            <select
              name="timezone"
              value={formData.timezone}
              onChange={handleChange}
              required
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Tournament Winner Prediction *</label>
            <select
              name="tournament_winner_id"
              value={formData.tournament_winner_id}
              onChange={handleChange}
              required
            >
              <option value="">-- Select a team --</option>
              {teams.filter((team) => !isPlaceholderTeam(team.name)).map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.code})
                </option>
              ))}
            </select>
            <small className="form-help">You can change this before the tournament starts</small>
          </div>

          <div className="registration-fee-notice">
            <p><strong>Registration Fee:</strong> 5 GBP</p>
            <p>Payment must be made to an administrator before the first game.</p>
          </div>

          {IS_PROD && (
            <div className="captcha-wrapper">
              <ReCAPTCHA ref={recaptchaRef} sitekey={RECAPTCHA_SITE_KEY} />
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <div className="links">
          <Link to="/login">Already have an account? Login</Link>
        </div>
      </div>
    </div>
  )
}
