import { useState, useEffect, useCallback } from 'react'
import { adminAPI, teamsAPI } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import type { Team } from '../types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdminUser {
  id: number
  username: string
  first_name: string
  surname: string
  email: string
  is_admin: boolean
  is_cachier: boolean
  is_player: boolean
  has_paid: boolean
  payment_date: string | null
  payment_received_by: string | null
}

interface AdminGame {
  id: number
  team_a: { id: number; name: string }
  team_b: { id: number; name: string }
  game_date: string
  location: string
  stage: string
  group: string | null
  competition_round: { id: number; name: string; round_number: number }
  is_scored: boolean
  is_prediction_closed: boolean
  team_a_score: number | null
  team_b_score: number | null
  is_double_points: boolean
  scored_at: string | null
}

interface AdminNews {
  id: number
  title: string
  content: string
  image_url: string | null
  author: string
  created_at: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRoleLabel(u: AdminUser) {
  if (u.is_admin) return 'Admin'
  if (u.is_cachier) return 'Cashier'
  return 'Player'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PaymentsTab() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState<number | null>(null)
  const [msg, setMsg] = useState('')

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await adminAPI.getUsers()
      setUsers(res.data)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const togglePayment = async (u: AdminUser) => {
    setBusy(u.id)
    setMsg('')
    // Optimistic update: flip has_paid immediately so the button reflects the
    // new state without waiting for the full API round-trip.
    setUsers(prev => prev.map(p => p.id === u.id ? { ...p, has_paid: !u.has_paid } : p))
    try {
      if (u.has_paid) {
        await adminAPI.removePayment(u.id)
        setMsg(`Payment removed for ${u.username}`)
      } else {
        await adminAPI.recordPayment(u.id)
        setMsg(`Payment recorded for ${u.username}`)
      }
      // Silent refresh to pull payment_date and payment_received_by from the server
      await load(true)
    } catch {
      // Revert the optimistic update if the API call failed
      setUsers(prev => prev.map(p => p.id === u.id ? { ...p, has_paid: u.has_paid } : p))
      setMsg('Error updating payment status')
    } finally {
      setBusy(null)
    }
  }

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.first_name.toLowerCase().includes(search.toLowerCase()) ||
    u.surname.toLowerCase().includes(search.toLowerCase())
  )

  const paid = users.filter(u => u.has_paid).length

  if (loading) return <div className="admin-loading">Loading users...</div>

  return (
    <div className="admin-tab-content">
      <div className="admin-section-header">
        <div>
          <h2>Payment Management</h2>
          <p className="admin-subtitle">{paid} / {users.length} players have paid</p>
        </div>
        <input
          className="admin-search"
          placeholder="Search player..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {msg && <div className="admin-message">{msg}</div>}

      <div className="payment-list">
        {filtered.map(u => (
          <div key={u.id} className={`payment-card ${u.has_paid ? 'payment-card-paid' : 'payment-card-unpaid'}`}>
            <div className="payment-card-main">
              <div className="payment-card-identity">
                <strong className="payment-card-username">{u.username}</strong>
                <span className="payment-card-name">{u.first_name} {u.surname}</span>
              </div>
              <div className="payment-card-badges">
                <span className={`role-badge role-${getRoleLabel(u).toLowerCase()}`}>{getRoleLabel(u)}</span>
                <span className={`payment-badge ${u.has_paid ? 'paid' : 'unpaid'}`}>
                  {u.has_paid ? 'Paid' : 'Unpaid'}
                </span>
              </div>
              <button
                className={`admin-btn-sm ${u.has_paid ? 'btn-danger' : 'btn-success'}`}
                onClick={() => togglePayment(u)}
                disabled={busy === u.id}
              >
                {busy === u.id ? '...' : u.has_paid ? 'Remove' : 'Mark Paid'}
              </button>
            </div>
            {u.has_paid && (
              <div className="payment-card-meta">
                {u.payment_date && <span>Paid: {formatDate(u.payment_date)}</span>}
                {u.payment_received_by && <span>· Received by: {u.payment_received_by}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ScoreEntryTab() {
  const [games, setGames] = useState<AdminGame[]>([])
  const [loading, setLoading] = useState(true)
  const [scores, setScores] = useState<Record<number, { a: string; b: string }>>({})
  const [busy, setBusy] = useState<number | null>(null)
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null)
  const [filter, setFilter] = useState<'unscored' | 'scored' | 'all'>('unscored')
  const [roundFilter, setRoundFilter] = useState<number | 'all'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminAPI.getGames()
      setGames(res.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const rounds = [...new Map(games.map(g => [g.competition_round.id, g.competition_round])).values()]

  const visible = games.filter(g => {
    if (filter === 'unscored' && g.is_scored) return false
    if (filter === 'scored' && !g.is_scored) return false
    if (roundFilter !== 'all' && g.competition_round.id !== roundFilter) return false
    return true
  })

  const setScore = (gameId: number, side: 'a' | 'b', val: string) => {
    setScores(prev => ({ ...prev, [gameId]: { ...prev[gameId], [side]: val } }))
  }

  const submitScore = async (game: AdminGame) => {
    const s = scores[game.id]
    if (!s?.a || !s?.b || isNaN(Number(s.a)) || isNaN(Number(s.b))) {
      setMsg({ text: 'Enter valid scores for both teams', type: 'err' })
      return
    }
    setBusy(game.id)
    setMsg(null)
    try {
      await adminAPI.enterScore(game.id, { team_a_score: Number(s.a), team_b_score: Number(s.b) })
      setMsg({ text: `Score saved: ${game.team_a.name} ${s.a}–${s.b} ${game.team_b.name}`, type: 'ok' })
      setScores(prev => { const n = { ...prev }; delete n[game.id]; return n })
      await load()
    } catch (e: any) {
      setMsg({ text: e.response?.data?.error ?? 'Error saving score', type: 'err' })
    } finally {
      setBusy(null)
    }
  }

  const rollback = async (game: AdminGame) => {
    if (!confirm(`Roll back score for ${game.team_a.name} vs ${game.team_b.name}? This will recalculate all rankings.`)) return
    setBusy(game.id)
    setMsg(null)
    try {
      await adminAPI.rollbackScore(game.id)
      setMsg({ text: `Score rolled back for ${game.team_a.name} vs ${game.team_b.name}`, type: 'ok' })
      await load()
    } catch (e: any) {
      setMsg({ text: e.response?.data?.error ?? 'Error rolling back', type: 'err' })
    } finally {
      setBusy(null)
    }
  }

  if (loading) return <div className="admin-loading">Loading games...</div>

  return (
    <div className="admin-tab-content">
      <div className="admin-section-header">
        <div>
          <h2>Score Entry</h2>
          <p className="admin-subtitle">
            {games.filter(g => g.is_scored).length} / {games.length} games scored
          </p>
        </div>
        <div className="admin-filters">
          <select className="admin-select" value={filter} onChange={e => setFilter(e.target.value as any)}>
            <option value="unscored">Unscored</option>
            <option value="scored">Scored</option>
            <option value="all">All games</option>
          </select>
          <select className="admin-select" value={roundFilter} onChange={e => setRoundFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
            <option value="all">All rounds</option>
            {rounds.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      </div>

      {msg && <div className={`admin-message ${msg.type === 'err' ? 'admin-message-error' : ''}`}>{msg.text}</div>}

      <div className="admin-games-list">
        {visible.length === 0 && <p className="admin-empty">No games match the current filter.</p>}
        {visible.map(game => (
          <div key={game.id} className={`admin-game-card ${game.is_double_points ? 'double-pts' : ''}`}>
            <div className="admin-game-meta">
              <span className="admin-game-round">{game.competition_round.name}</span>
              {game.is_double_points && <span className="double-pts-badge">2×</span>}
              <span className="admin-game-date">{formatDate(game.game_date)}</span>
              <span className="admin-game-location">{game.location}</span>
              {game.group && <span className="admin-game-stage">Group {game.group}</span>}
            </div>

            <div className="admin-game-teams">
              <span className="admin-team-name team-a">{game.team_a.name}</span>

              {game.is_scored ? (
                <div className="admin-score-display">
                  <span className="admin-score-result">
                    {game.team_a_score} — {game.team_b_score}
                  </span>
                  <button
                    className="admin-btn-sm btn-warning"
                    onClick={() => rollback(game)}
                    disabled={busy === game.id}
                  >
                    {busy === game.id ? '...' : 'Rollback'}
                  </button>
                </div>
              ) : game.is_prediction_closed ? (
                <div className="admin-score-inputs">
                  <input
                    type="number"
                    min="0"
                    className="admin-score-input"
                    placeholder="0"
                    value={scores[game.id]?.a ?? ''}
                    onChange={e => setScore(game.id, 'a', e.target.value)}
                  />
                  <span className="score-sep">—</span>
                  <input
                    type="number"
                    min="0"
                    className="admin-score-input"
                    placeholder="0"
                    value={scores[game.id]?.b ?? ''}
                    onChange={e => setScore(game.id, 'b', e.target.value)}
                  />
                  <button
                    className="admin-btn-sm btn-primary"
                    onClick={() => submitScore(game)}
                    disabled={busy === game.id}
                  >
                    {busy === game.id ? '...' : 'Save'}
                  </button>
                </div>
              ) : (
                <span className="admin-score-open">Predictions still open</span>
              )}

              <span className="admin-team-name team-b">{game.team_b.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TournamentTab() {
  const [winner, setWinner] = useState<{ id: number; name: string } | null | undefined>(undefined)
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null)

  const load = useCallback(async () => {
    const [wr, tr] = await Promise.all([adminAPI.getTournamentWinner(), teamsAPI.getAll()])
    setWinner(wr.data.winner)
    // Filter out placeholder teams
    const real = tr.data.filter((t: Team) => !/^\d|^W\d|^L\d|runner|winner|place|loser|UEFA/i.test(t.name))
    setTeams(real)
  }, [])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!selectedTeam) return
    if (!confirm(`Set ${teams.find(t => t.id === Number(selectedTeam))?.name} as tournament winner? This will award 15-point bonuses.`)) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await adminAPI.setTournamentWinner(Number(selectedTeam))
      setMsg({ text: `${res.data.message} — ${res.data.correct_predictions} player(s) earned the bonus`, type: 'ok' })
      await load()
    } catch (e: any) {
      setMsg({ text: e.response?.data?.error ?? 'Error', type: 'err' })
    } finally {
      setBusy(false)
    }
  }

  const rollback = async () => {
    if (!confirm('Roll back the tournament winner? This will remove the 15-point bonuses and recalculate rankings.')) return
    setBusy(true)
    setMsg(null)
    try {
      await adminAPI.rollbackTournamentWinner()
      setMsg({ text: 'Tournament winner rolled back', type: 'ok' })
      setSelectedTeam('')
      await load()
    } catch (e: any) {
      setMsg({ text: e.response?.data?.error ?? 'Error', type: 'err' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-tab-content">
      <div className="admin-section-header">
        <div>
          <h2>Tournament Winner</h2>
          <p className="admin-subtitle">Awards 15 bonus points to correct predictors</p>
        </div>
      </div>

      {msg && <div className={`admin-message ${msg.type === 'err' ? 'admin-message-error' : ''}`}>{msg.text}</div>}

      {winner ? (
        <div className="admin-winner-display">
          <div className="admin-winner-card">
            <div className="admin-winner-trophy">🏆</div>
            <div className="admin-winner-name">{winner.name}</div>
            <p className="admin-winner-sub">Tournament winner — 15-point bonuses awarded</p>
            <button className="admin-btn btn-warning" onClick={rollback} disabled={busy}>
              {busy ? 'Rolling back...' : 'Rollback Winner'}
            </button>
          </div>
        </div>
      ) : (
        <div className="admin-winner-form">
          <p className="admin-winner-hint">Select the team that won the tournament. This is a one-time operation. Use rollback if you make an error.</p>
          <div className="admin-winner-controls">
            <select
              className="admin-select admin-select-lg"
              value={selectedTeam}
              onChange={e => setSelectedTeam(e.target.value)}
            >
              <option value="">— Select winning team —</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button
              className="admin-btn btn-primary"
              onClick={save}
              disabled={!selectedTeam || busy}
            >
              {busy ? 'Saving...' : 'Set Winner & Award Bonuses'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function NewsTab() {
  const [articles, setArticles] = useState<AdminNews[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdminNews | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', image_url: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminAPI.getNews()
      setArticles(res.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditing(null)
    setForm({ title: '', content: '', image_url: '' })
    setShowForm(true)
  }

  const openEdit = (a: AdminNews) => {
    setEditing(a)
    setForm({ title: a.title, content: a.content, image_url: a.image_url ?? '' })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setMsg({ text: 'Title and content are required', type: 'err' })
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const payload = { title: form.title.trim(), content: form.content.trim(), image_url: form.image_url.trim() || undefined }
      if (editing) {
        await adminAPI.updateNews(editing.id, payload)
        setMsg({ text: 'Article updated', type: 'ok' })
      } else {
        await adminAPI.createNews(payload)
        setMsg({ text: 'Article published', type: 'ok' })
      }
      setShowForm(false)
      await load()
    } catch {
      setMsg({ text: 'Error saving article', type: 'err' })
    } finally {
      setBusy(false)
    }
  }

  const del = async (a: AdminNews) => {
    if (!confirm(`Delete "${a.title}"? This cannot be undone.`)) return
    setBusy(true)
    try {
      await adminAPI.deleteNews(a.id)
      setMsg({ text: 'Article deleted', type: 'ok' })
      await load()
    } catch {
      setMsg({ text: 'Error deleting article', type: 'err' })
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="admin-loading">Loading articles...</div>

  return (
    <div className="admin-tab-content">
      <div className="admin-section-header">
        <div>
          <h2>News Management</h2>
          <p className="admin-subtitle">{articles.length} article{articles.length !== 1 ? 's' : ''} published</p>
        </div>
        <button className="admin-btn btn-primary" onClick={openNew}>+ New Article</button>
      </div>

      {msg && <div className={`admin-message ${msg.type === 'err' ? 'admin-message-error' : ''}`}>{msg.text}</div>}

      {showForm && (
        <div className="admin-form-card">
          <h3>{editing ? 'Edit Article' : 'New Article'}</h3>
          <div className="admin-form-group">
            <label>Title</label>
            <input className="admin-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Article title" />
          </div>
          <div className="admin-form-group">
            <label>Content</label>
            <textarea className="admin-textarea" rows={6} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Article content..." />
          </div>
          <div className="admin-form-group">
            <label>Image URL <span className="optional">(optional)</span></label>
            <input className="admin-input" value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="admin-form-actions">
            <button className="admin-btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="admin-btn btn-primary" onClick={save} disabled={busy}>
              {busy ? 'Saving...' : editing ? 'Update' : 'Publish'}
            </button>
          </div>
        </div>
      )}

      <div className="admin-news-list">
        {articles.length === 0 && <p className="admin-empty">No articles yet.</p>}
        {articles.map(a => (
          <div key={a.id} className="admin-news-item">
            <div className="admin-news-info">
              <strong>{a.title}</strong>
              <span className="admin-news-meta">by {a.author} · {formatDate(a.created_at)}</span>
              <p className="admin-news-preview">{a.content.slice(0, 120)}{a.content.length > 120 ? '...' : ''}</p>
            </div>
            <div className="admin-news-actions">
              <button className="admin-btn-sm btn-secondary" onClick={() => openEdit(a)}>Edit</button>
              <button className="admin-btn-sm btn-danger" onClick={() => del(a)} disabled={busy}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function UsersTab({ currentUserId }: { currentUserId: number }) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState<number | null>(null)
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminAPI.getUsers()
      setUsers(res.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const del = async (u: AdminUser) => {
    if (!confirm(`Delete user "${u.username}" (${u.first_name} ${u.surname})?\n\nThis will permanently remove their account, all predictions, rankings, and payment records. This cannot be undone.`)) return
    setBusy(u.id)
    setMsg(null)
    try {
      await adminAPI.deleteUser(u.id)
      setMsg({ text: `User ${u.username} deleted`, type: 'ok' })
      await load()
    } catch (e: any) {
      setMsg({ text: e.response?.data?.error ?? 'Error deleting user', type: 'err' })
    } finally {
      setBusy(null)
    }
  }

  const setRole = async (u: AdminUser, role: 'player' | 'cachier' | 'admin') => {
    setBusy(u.id)
    setMsg(null)
    try {
      await adminAPI.updateUserRole(u.id, {
        is_player: true,
        is_cachier: role === 'cachier' || role === 'admin',
        is_admin: role === 'admin'
      })
      setMsg({ text: `${u.username} is now a ${role}`, type: 'ok' })
      await load()
    } catch (e: any) {
      setMsg({ text: e.response?.data?.error ?? 'Error updating role', type: 'err' })
    } finally {
      setBusy(null)
    }
  }

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.first_name.toLowerCase().includes(search.toLowerCase()) ||
    u.surname.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="admin-loading">Loading users...</div>

  return (
    <div className="admin-tab-content">
      <div className="admin-section-header">
        <div>
          <h2>User Management</h2>
          <p className="admin-subtitle">{users.length} registered user{users.length !== 1 ? 's' : ''}</p>
        </div>
        <input
          className="admin-search"
          placeholder="Search player..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {msg && <div className={`admin-message ${msg.type === 'err' ? 'admin-message-error' : ''}`}>{msg.text}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Change Role</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const currentRole = u.is_admin ? 'admin' : u.is_cachier ? 'cachier' : 'player'
              const isSelf = u.id === currentUserId
              return (
                <tr key={u.id}>
                  <td><strong>{u.username}</strong>{isSelf && <span className="self-badge"> (you)</span>}</td>
                  <td>{u.first_name} {u.surname}</td>
                  <td className="admin-email">{u.email}</td>
                  <td><span className={`role-badge role-${getRoleLabel(u).toLowerCase()}`}>{getRoleLabel(u)}</span></td>
                  <td>
                    {!isSelf ? (
                      <select
                        className="admin-select-sm"
                        value={currentRole}
                        disabled={busy === u.id}
                        onChange={e => setRole(u, e.target.value as any)}
                      >
                        <option value="player">Player</option>
                        <option value="cachier">Cashier</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : <span className="admin-na">—</span>}
                  </td>
                  <td>
                    {!isSelf ? (
                      <button
                        className="admin-btn-sm btn-danger"
                        onClick={() => del(u)}
                        disabled={busy === u.id}
                      >
                        {busy === u.id ? '...' : 'Delete'}
                      </button>
                    ) : <span className="admin-na">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab() {
  const { datetimeOffsetMs, setDatetimeOffset } = useAuthStore()
  const [inputValue, setInputValue] = useState(
    datetimeOffsetMs != null
      ? new Date(Date.now() + datetimeOffsetMs).toISOString().slice(0, 16)
      : ''
  )
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null)

  // AI daily limit
  const [aiLimit, setAiLimit] = useState('50')
  const [aiLimitBusy, setAiLimitBusy] = useState(false)
  const [aiLimitMsg, setAiLimitMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null)

  useEffect(() => {
    adminAPI.getAiLimit().then(r => setAiLimit(String(r.data.limit))).catch(() => {})
  }, [])

  const saveAiLimit = async () => {
    setAiLimitBusy(true); setAiLimitMsg(null)
    try {
      const res = await adminAPI.setAiLimit(parseInt(aiLimit))
      setAiLimitMsg({ text: res.data.message, type: 'ok' })
    } catch (e: any) {
      setAiLimitMsg({ text: e.response?.data?.error ?? 'Error saving limit', type: 'err' })
    } finally { setAiLimitBusy(false) }
  }

  // Full reset
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetBusy, setResetBusy] = useState(false)
  const [resetMsg, setResetMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null)
  const [resetResult, setResetResult] = useState<Record<string, number> | null>(null)

  const executeReset = async () => {
    setResetBusy(true); setResetMsg(null); setResetResult(null)
    try {
      const res = await adminAPI.resetAll()
      setResetResult(res.data.deleted)
      setResetMsg({ text: res.data.message, type: 'ok' })
      setResetConfirm('')
    } catch (e: any) {
      setResetMsg({ text: e.response?.data?.error ?? 'Reset failed', type: 'err' })
    } finally { setResetBusy(false) }
  }

  const save = async () => {
    if (!inputValue) { setMsg({ text: 'Please select a date and time', type: 'err' }); return }
    setBusy(true); setMsg(null)
    try {
      const res = await adminAPI.setDatetimeOverride(inputValue + ':00')
      setDatetimeOffset(res.data.offset_seconds * 1000)
      setMsg({ text: `Override active — simulated time advances with real time from ${inputValue} UTC`, type: 'ok' })
    } catch (e: any) {
      setMsg({ text: e.response?.data?.error ?? 'Error setting override', type: 'err' })
    } finally { setBusy(false) }
  }

  const clear = async () => {
    setBusy(true); setMsg(null)
    try {
      await adminAPI.clearDatetimeOverride()
      setDatetimeOffset(null)
      setInputValue('')
      setMsg({ text: 'Override cleared — app is now using real system time', type: 'ok' })
    } catch (e: any) {
      setMsg({ text: e.response?.data?.error ?? 'Error clearing override', type: 'err' })
    } finally { setBusy(false) }
  }

  return (
    <div className="admin-tab-content">
      <div className="admin-section-header">
        <div>
          <h2>Datetime Override</h2>
          <p className="admin-subtitle">Simulate any point in time for testing. Affects all time-sensitive logic: prediction deadlines, open/closed games, registration windows.</p>
        </div>
      </div>

      {msg && <div className={`admin-message ${msg.type === 'err' ? 'admin-message-error' : ''}`}>{msg.text}</div>}

      <div className="admin-form-card">
        <div className={`override-status-banner ${datetimeOffsetMs != null ? 'active' : 'inactive'}`}>
          {datetimeOffsetMs != null ? (
            <>
              <span className="override-dot active" />
              <span>OVERRIDE ACTIVE — Currently simulating: <strong>
                {new Date(Date.now() + datetimeOffsetMs).toLocaleString('en-GB', {
                  day: '2-digit', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
                })} UTC
              </strong></span>
            </>
          ) : (
            <>
              <span className="override-dot inactive" />
              <span>REAL SYSTEM TIME — No override set</span>
            </>
          )}
        </div>

        <div className="admin-form-group" style={{ marginTop: '1.25rem' }}>
          <label>Set simulated date & time <span className="optional">(UTC)</span></label>
          <div className="override-input-row">
            <input
              type="datetime-local"
              className="admin-input"
              style={{ maxWidth: 260 }}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
            />
            <button className="admin-btn btn-primary" onClick={save} disabled={busy || !inputValue}>
              {busy ? 'Saving...' : datetimeOffsetMs != null ? 'Update' : 'Activate Override'}
            </button>
            {datetimeOffsetMs != null && (
              <button className="admin-btn btn-danger" onClick={clear} disabled={busy}>
                Clear Override
              </button>
            )}
          </div>
        </div>

        <div className="override-examples">
          <p><strong>Example use cases:</strong></p>
          <ul>
            <li>Set to 2h before a game → verify predictions are still open</li>
            <li>Set to after a game start → verify predictions close correctly</li>
            <li>Set to 2026-06-09 → test pre-tournament registration window</li>
            <li>Set to 2026-07-20 → test post-tournament state</li>
          </ul>
        </div>
      </div>

      {/* ── AI Daily Call Limit ─────────────────────────────────── */}
      <div className="admin-section-header" style={{ marginTop: '2rem' }}>
        <div>
          <h2>AI Assistant — Daily Call Limit</h2>
          <p className="admin-subtitle">Maximum number of MCP tool calls per user per day. Resets at midnight UTC. Default: 50 (covers ~2 full chat sessions). 20 users × 50 = 1,000 calls/day — within Gemini free tier (1,500/day).</p>
        </div>
      </div>
      {aiLimitMsg && <div className={`admin-message ${aiLimitMsg.type === 'err' ? 'admin-message-error' : ''}`}>{aiLimitMsg.text}</div>}
      <div className="admin-form-card">
        <div className="admin-form-group">
          <label>Daily call limit per user</label>
          <div className="override-input-row">
            <input
              type="number"
              className="admin-input"
              style={{ maxWidth: 120 }}
              min={1}
              max={1000}
              value={aiLimit}
              onChange={e => setAiLimit(e.target.value)}
            />
            <button className="admin-btn btn-primary" onClick={saveAiLimit} disabled={aiLimitBusy}>
              {aiLimitBusy ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Full Reset ─────────────────────────────────────────── */}
      <div className="admin-section-header" style={{ marginTop: '2rem' }}>
        <div>
          <h2 style={{ color: 'var(--red)' }}>Full Reset</h2>
          <p className="admin-subtitle">Permanently wipes all scores, predictions and rankings. Tournament winner is also cleared. Game fixtures and user accounts are kept. This action cannot be undone.</p>
        </div>
      </div>

      <div className="admin-form-card" style={{ borderLeft: '4px solid var(--red)' }}>
        <p style={{ fontSize: '0.85rem', marginBottom: '0.75rem', color: '#555' }}>
          The following will be deleted:
        </p>
        <ul style={{ fontSize: '0.82rem', color: '#555', paddingLeft: '1.2rem', lineHeight: 1.9, marginBottom: '1.25rem' }}>
          <li>All <strong>predictions</strong> (and their history) made by every player</li>
          <li>All <strong>rankings</strong> (overall and per-round) and ranking history</li>
          <li>All <strong>game scores</strong> (games revert to unscored)</li>
          <li>The <strong>tournament winner</strong> setting and associated bonus points</li>
        </ul>

        {resetMsg && (
          <div className={`admin-message ${resetMsg.type === 'err' ? 'admin-message-error' : ''}`} style={{ marginBottom: '1rem' }}>
            {resetMsg.text}
            {resetResult && (
              <ul style={{ margin: '0.4rem 0 0 1rem', fontSize: '0.8rem' }}>
                <li>Predictions deleted: {resetResult.predictions}</li>
                <li>Prediction history deleted: {resetResult.prediction_history}</li>
                <li>Rankings deleted: {resetResult.rankings}</li>
                <li>Ranking history deleted: {resetResult.ranking_history}</li>
                <li>Games reset: {resetResult.games_reset}</li>
              </ul>
            )}
          </div>
        )}

        <div className="admin-form-group">
          <label>Type <strong>RESET ALL</strong> to confirm</label>
          <div className="override-input-row">
            <input
              className="admin-input"
              style={{ maxWidth: 200 }}
              placeholder="RESET ALL"
              value={resetConfirm}
              onChange={e => setResetConfirm(e.target.value)}
            />
            <button
              className="admin-btn btn-danger"
              onClick={executeReset}
              disabled={resetConfirm !== 'RESET ALL' || resetBusy}
            >
              {resetBusy ? 'Resetting...' : 'Execute Full Reset'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabId = 'payments' | 'scores' | 'tournament' | 'news' | 'users' | 'settings'

export default function AdminPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.is_admin ?? false
  const [activeTab, setActiveTab] = useState<TabId>('payments')

  const tabs: { id: TabId; label: string; adminOnly: boolean }[] = [
    { id: 'payments',   label: 'Payments',    adminOnly: false },
    { id: 'scores',     label: 'Score Entry', adminOnly: true  },
    { id: 'tournament', label: 'Tournament',  adminOnly: true  },
    { id: 'news',       label: 'News',        adminOnly: false },
    { id: 'users',      label: 'Users',       adminOnly: true  },
    { id: 'settings',   label: '⏱ Settings',  adminOnly: true  },
  ]

  const visibleTabs = tabs.filter(t => !t.adminOnly || isAdmin)

  // Reset to first visible tab if current is not available
  const currentTab = visibleTabs.find(t => t.id === activeTab) ? activeTab : visibleTabs[0]?.id

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p className="admin-role-note">
          Logged in as <strong>{user?.username}</strong> ·{' '}
          <span className={`role-badge role-${isAdmin ? 'admin' : 'cashier'}`}>
            {isAdmin ? 'Admin' : 'Cashier'}
          </span>
        </p>
      </div>

      <div className="admin-tabs">
        {visibleTabs.map(t => (
          <button
            key={t.id}
            className={`admin-tab-btn ${currentTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {currentTab === 'payments'   && <PaymentsTab />}
      {currentTab === 'scores'     && <ScoreEntryTab />}
      {currentTab === 'tournament' && <TournamentTab />}
      {currentTab === 'news'       && <NewsTab />}
      {currentTab === 'users'      && <UsersTab currentUserId={user?.id ?? 0} />}
      {currentTab === 'settings'   && <SettingsTab />}
    </div>
  )
}
