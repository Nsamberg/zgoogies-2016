import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import ReCAPTCHA from 'react-google-recaptcha'
import { authAPI, adminAPI } from '../services/api'
import { useAuthStore } from '../stores/authStore'

// Development: Google's public test site key (always passes).
// Production: replace with your real site key from https://www.google.com/recaptcha/admin
const RECAPTCHA_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const recaptchaRef = useRef<ReCAPTCHA>(null)
  const navigate = useNavigate()
  const setUser = useAuthStore((state) => state.setUser)
  const setSystemDateOverride = useAuthStore((state) => state.setSystemDateOverride)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const captchaToken = recaptchaRef.current?.getValue() || ''
    if (!captchaToken) {
      setError('Please complete the CAPTCHA.')
      return
    }

    setLoading(true)
    try {
      const response = await authAPI.login(username, password, captchaToken)
      setUser(response.data.user)
      // Restore datetime override state (persists in DB across sessions)
      adminAPI.getDatetimeOverride()
        .then(r => setSystemDateOverride(r.data.override ?? null))
        .catch(() => {})
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed')
      recaptchaRef.current?.reset()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>⚽ ZGoogies Login</h1>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="captcha-wrapper">
            <ReCAPTCHA ref={recaptchaRef} sitekey={RECAPTCHA_SITE_KEY} />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <div className="links">
          <Link to="/register">Register</Link>
          <Link to="/reset-password">Forgot Password?</Link>
        </div>
      </div>
    </div>
  )
}
