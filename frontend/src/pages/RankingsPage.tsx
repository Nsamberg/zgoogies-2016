import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts'
import { rankingsAPI } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import { Ranking, CompetitionRound } from '../types'

type TabId = 'overall' | number

interface HistoryPoint {
  rank: number
  total_points: number
  game_id: number
  created_at: string
  label: string   // "Game N"
}

function TrendIcon({ rank, previous }: { rank: number; previous?: number | null }) {
  if (previous == null) return <span className="trend trend--neutral">—</span>
  if (rank < previous) return <span className="trend trend--up">▲</span>
  if (rank > previous) return <span className="trend trend--down">▼</span>
  return <span className="trend trend--neutral">—</span>
}

// ── Player history charts view ────────────────────────────────────────────────

function PlayerHistoryView({
  player,
  rounds,
  onBack,
}: {
  player: Ranking
  rounds: CompetitionRound[]
  onBack: () => void
}) {
  const [histTab, setHistTab] = useState<TabId>('overall')
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [loading, setLoading] = useState(true)

  const fetchHistory = useCallback(async (tab: TabId) => {
    setLoading(true)
    try {
      const roundId = tab === 'overall' ? undefined : (tab as number)
      const res = await rankingsAPI.getHistory(player.user.id, roundId)
      const pts: HistoryPoint[] = res.data.map((h: any, i: number) => ({
        ...h,
        label: `G${i + 1}`,
      }))
      setHistory(pts)
    } catch {
      setHistory([])
    } finally {
      setLoading(false)
    }
  }, [player.user.id])

  useEffect(() => { fetchHistory('overall') }, [fetchHistory])

  const handleHistTab = (tab: TabId) => {
    setHistTab(tab)
    fetchHistory(tab)
  }

  const maxRank = history.length > 0 ? Math.max(...history.map(h => h.rank)) + 1 : 10

  return (
    <div className="player-history-view">
      <button className="back-btn" onClick={onBack}>← Back to Rankings</button>

      <div className="player-history-header">
        <div>
          <h2 className="player-history-name">{player.user.username}</h2>
          <p className="player-history-sub">
            {player.user.first_name} {player.user.surname}
            <span className="separator">·</span>
            Rank #{player.rank}
            <span className="separator">·</span>
            {player.total_points} pts
          </p>
        </div>
      </div>

      {/* Round selector for history */}
      <div className="page-tabs" style={{ marginBottom: '1.25rem' }}>
        <button
          className={`tab-btn${histTab === 'overall' ? ' active' : ''}`}
          onClick={() => handleHistTab('overall')}
        >Overall</button>
        {rounds.map(r => (
          <button
            key={r.id}
            className={`tab-btn${histTab === r.id ? ' active' : ''}`}
            onClick={() => handleHistTab(r.id)}
          >{r.name}</button>
        ))}
      </div>

      {loading && <p className="loading-text">Loading history…</p>}

      {!loading && history.length === 0 && (
        <p className="empty-state">No history yet — rankings update after each scored game.</p>
      )}

      {!loading && history.length > 0 && (
        <div className="player-history-charts">

          {/* Points progression */}
          <div className="history-chart-card">
            <h3 className="history-chart-title">Points progression</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={history} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(val: number) => [`${val} pts`, 'Points']}
                  labelFormatter={(l: string) => l}
                />
                <Line
                  type="monotone"
                  dataKey="total_points"
                  stroke="#1B1464"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#1B1464' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Rank progression (inverted: lower rank = higher on chart) */}
          <div className="history-chart-card">
            <h3 className="history-chart-title">Rank progression <span className="history-chart-hint">(lower = better)</span></h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={history} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  reversed
                  domain={[1, maxRank]}
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => `#${v}`}
                />
                <Tooltip
                  formatter={(val: number) => [`#${val}`, 'Rank']}
                  labelFormatter={(l: string) => l}
                />
                <ReferenceLine y={1} stroke="#D4AC0D" strokeDasharray="4 3" />
                <Line
                  type="monotone"
                  dataKey="rank"
                  stroke="#C8102E"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#C8102E' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

        </div>
      )}
    </div>
  )
}

// ── Main rankings page ────────────────────────────────────────────────────────

export default function RankingsPage() {
  const { user } = useAuthStore()

  const [rounds, setRounds] = useState<CompetitionRound[]>([])
  const [activeTab, setActiveTab] = useState<TabId>('overall')
  const [rankings, setRankings] = useState<Ranking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cache, setCache] = useState<Record<string, Ranking[]>>({})

  // Selected player for history view
  const [selectedPlayer, setSelectedPlayer] = useState<Ranking | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const [roundsRes, overallRes] = await Promise.all([
          rankingsAPI.getRounds(),
          rankingsAPI.getOverall(),
        ])
        setRounds(roundsRes.data)
        const overall: Ranking[] = overallRes.data
        setRankings(overall)
        setCache({ overall: overall })
      } catch {
        setError('Failed to load rankings. Please refresh.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const handleTabChange = async (tab: TabId) => {
    setActiveTab(tab)
    setSelectedPlayer(null)
    const key = tab === 'overall' ? 'overall' : String(tab)
    if (cache[key]) { setRankings(cache[key]); return }
    setLoading(true)
    setError('')
    try {
      const res = tab === 'overall'
        ? await rankingsAPI.getOverall()
        : await rankingsAPI.getRound(tab as number)
      const data: Ranking[] = res.data
      setRankings(data)
      setCache((prev) => ({ ...prev, [key]: data }))
    } catch {
      setError('Failed to load rankings.')
    } finally {
      setLoading(false)
    }
  }

  // Player history view
  if (selectedPlayer) {
    return (
      <div className="rankings-page">
        <PlayerHistoryView
          player={selectedPlayer}
          rounds={rounds}
          onBack={() => setSelectedPlayer(null)}
        />
      </div>
    )
  }

  return (
    <div className="rankings-page">
      <h2 className="page-title">Rankings</h2>

      <div className="page-tabs">
        <button
          className={`tab-btn${activeTab === 'overall' ? ' active' : ''}`}
          onClick={() => handleTabChange('overall')}
        >Overall</button>
        {rounds.map((round) => (
          <button
            key={round.id}
            className={`tab-btn${activeTab === round.id ? ' active' : ''}${round.is_current ? ' tab-btn--current' : ''}`}
            onClick={() => handleTabChange(round.id)}
          >
            {round.name}
            {round.game_count != null && (
              <span className="tab-game-count">{round.game_count}</span>
            )}
          </button>
        ))}
      </div>

      {loading && <p className="loading-text">Loading rankings...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && rankings.length === 0 && (
        <p className="empty-state">No rankings yet — they update after each game is scored.</p>
      )}

      {!loading && !error && rankings.length > 0 && (
        <div className="rankings-table-wrap">
          <p className="rankings-click-hint">Click any player to view their ranking history</p>
          <table className="rankings-table">
            <thead>
              <tr>
                <th className="col-rank">#</th>
                <th className="col-player">Player</th>
                <th className="col-points">Points</th>
                <th className="col-trend">Trend</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((r) => {
                const isMe = r.user.id === user?.id
                return (
                  <tr
                    key={r.user.id}
                    className={`ranking-row-clickable${isMe ? ' row-me' : ''}`}
                    onClick={() => setSelectedPlayer(r)}
                    title="View ranking history"
                  >
                    <td className="col-rank">
                      {r.rank <= 3
                        ? <span className={`medal medal--${r.rank}`}>{r.rank}</span>
                        : r.rank}
                    </td>
                    <td className="col-player">
                      <span className="player-username">{r.user.username}</span>
                      <span className="player-fullname">{r.user.first_name} {r.user.surname}</span>
                    </td>
                    <td className="col-points">{r.total_points}</td>
                    <td className="col-trend">
                      <TrendIcon rank={r.rank} previous={r.previous_rank} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
