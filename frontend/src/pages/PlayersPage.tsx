import { useState, useEffect, useMemo } from 'react'
import { playersAPI, rivalsAPI } from '../services/api'
import { useAuthStore } from '../stores/authStore'

interface Player {
  id: number
  username: string
  first_name: string
  surname: string
  has_paid: boolean
  timezone: string
  is_player: boolean
  is_cachier: boolean
  is_admin: boolean
}

type Role = 'player' | 'cachier' | 'admin'

function getRole(p: Player): Role {
  if (p.is_admin) return 'admin'
  if (p.is_cachier) return 'cachier'
  return 'player'
}

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  cachier: 'Cashier',
  player: 'Player',
}

export default function PlayersPage() {
  const { user } = useAuthStore()
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [activeRoles, setActiveRoles] = useState<Set<Role>>(new Set())
  const [search, setSearch] = useState('')
  const [rivals, setRivals] = useState<number[]>([])

  useEffect(() => {
    playersAPI.getAll()
      .then((res) => setPlayers(res.data))
      .catch(() => setError('Failed to load players. Please refresh.'))
      .finally(() => setLoading(false))

    rivalsAPI.get()
      .then((res) => setRivals(res.data))
      .catch(() => {})
  }, [])

  const handleToggleRival = async (playerId: number, isRival: boolean) => {
    if (isRival) {
      setRivals(prev => prev.filter(id => id !== playerId))
      try { await rivalsAPI.remove(playerId) } catch { setRivals(prev => [...prev, playerId]) }
    } else {
      setRivals(prev => [...prev, playerId])
      try { await rivalsAPI.add(playerId) } catch { setRivals(prev => prev.filter(id => id !== playerId)) }
    }
  }

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const toggleRole = (role: Role) => {
    setExpandedId(null)
    setActiveRoles((prev) => {
      const next = new Set(prev)
      if (next.has(role)) next.delete(role)
      else next.add(role)
      return next
    })
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return players.filter((p) => {
      if (activeRoles.size > 0 && !activeRoles.has(getRole(p))) return false
      if (q && ![p.username, p.first_name, p.surname, `${p.first_name} ${p.surname}`]
               .some(s => s.toLowerCase().includes(q))) return false
      return true
    })
  }, [players, activeRoles, search])

  const adminCount = players.filter((p) => p.is_admin).length
  const cachierCount = players.filter((p) => p.is_cachier && !p.is_admin).length
  const playerCount = players.filter((p) => !p.is_cachier && !p.is_admin).length

  const filters: { key: Role; label: string; count: number }[] = [
    { key: 'player', label: 'Players', count: playerCount },
    { key: 'cachier', label: 'Cashiers', count: cachierCount },
    { key: 'admin', label: 'Admins', count: adminCount },
  ]

  const isAll = activeRoles.size === 0

  return (
    <div className="players-page">
      <h2 className="page-title">Players</h2>

      {loading && <p className="loading-text">Loading players...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <>
          <div className="players-summary">
            <span className="summary-stat"><strong>{players.length}</strong> registered</span>
            <span className="summary-divider">·</span>
            <span className="summary-stat"><strong>{playerCount}</strong> players</span>
            <span className="summary-divider">·</span>
            <span className="summary-stat"><strong>{cachierCount}</strong> cashiers</span>
            <span className="summary-divider">·</span>
            <span className="summary-stat"><strong>{adminCount}</strong> admins</span>
          </div>

          <input
            type="text"
            className="player-search"
            placeholder="Search by name or username…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setExpandedId(null) }}
          />

          <div className="role-filters">
            <button
              className={`role-filter-btn${isAll ? ' active' : ''}`}
              onClick={() => { setActiveRoles(new Set()); setExpandedId(null) }}
            >
              All
              <span className="role-filter-count">{players.length}</span>
            </button>
            {filters.map((f) => (
              <button
                key={f.key}
                className={`role-filter-btn${activeRoles.has(f.key) ? ' active' : ''}`}
                onClick={() => toggleRole(f.key)}
              >
                {f.label}
                <span className="role-filter-count">{f.count}</span>
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="empty-state">No players in this category.</p>
          )}

          <div className="players-list">
            {filtered.map((player) => {
              const role = getRole(player)
              const isExpanded = expandedId === player.id
              const isMe = player.id === user?.id
              const isRival = rivals.includes(player.id)
              return (
                <div key={player.id} className={`player-card${isExpanded ? ' expanded' : ''}`}>
                  <button
                    className="player-row"
                    onClick={() => toggleExpand(player.id)}
                    aria-expanded={isExpanded}
                  >
                    <div className="player-row-main">
                      <span className="player-username">{player.username}</span>
                      <span className="player-fullname">{player.first_name} {player.surname}</span>
                    </div>
                    <div className="player-row-right">
                      <span className={`role-badge role-badge--${role}`}>
                        {ROLE_LABELS[role]}
                      </span>
                      {!isMe && (
                        <button
                          className={`rival-star${isRival ? ' rival-star--active' : ''}`}
                          title={isRival ? 'Remove rival' : 'Add rival'}
                          onClick={e => { e.stopPropagation(); handleToggleRival(player.id, isRival) }}
                          aria-label={isRival ? 'Remove rival' : 'Add rival'}
                        >
                          {isRival ? '★' : '☆'}
                        </button>
                      )}
                      <span className="expand-icon">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="player-detail">
                      <div className="player-detail-row">
                        <span className="detail-label">Full name</span>
                        <span className="detail-value">{player.first_name} {player.surname}</span>
                      </div>
                      <div className="player-detail-row">
                        <span className="detail-label">Role</span>
                        <span className="detail-value">{ROLE_LABELS[role]}</span>
                      </div>
                      <div className="player-detail-row">
                        <span className="detail-label">Timezone</span>
                        <span className="detail-value">{player.timezone}</span>
                      </div>
                      <div className="player-detail-row">
                        <span className="detail-label">Payment</span>
                        <span className={`detail-value ${player.has_paid ? 'text-success' : 'text-warning'}`}>
                          {player.has_paid ? 'Confirmed' : 'Not yet received'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
