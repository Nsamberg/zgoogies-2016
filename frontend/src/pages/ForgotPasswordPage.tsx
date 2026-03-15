import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authAPI } from '../services/api'

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('')
  const [loading, setLoading] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authAPI.resetPassword(identifier.trim())
      setSentTo(res.data.email)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sentTo) {
    return (
      <div className="login-page">
        <div className="login-container">
          <h1>⚽ ZGoogies</h1>
          <div className="forgot-success">
            <p className="forgot-success-icon">✅</p>
            <p>A new temporary password has been sent to</p>
            <p><strong>{sentTo}</strong></p>
            <p className="forgot-hint">Check your inbox and use it to log in, then change your password in My Account.</p>
          </div>
          <div className="links">
            <Link to="/login">Back to login</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>⚽ ZGoogies</h1>
        <h2 className="forgot-subtitle">Reset Password</h2>
        <p className="forgot-description">
          Enter your username or email address. We'll send you a new temporary password.
        </p>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username or email</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter your username or email"
              required
              autoFocus
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send new password'}
          </button>
        </form>

        <div className="links">
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  )
}
