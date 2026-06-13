import { useState, useEffect, useCallback, useRef } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts'
import { rankingsAPI, rivalsAPI, playersAPI } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import { Ranking, CompetitionRound } from '../types'

type TabId = 'overall' | 'rivals' | number

interface HistoryPoint {
  rank: number
  total_points: number
  game_id: number
  created_at: string
  label: string
}

interface PlayerPrediction {
  game_id: number
  team_a: { id: number; name: string; score: number | null }
  team_b: { id: number; name: string; score: number | null }
  game_date: string
  stage: string
  competition_round: { id: number; name: string } | null
  is_scored: boolean
  is_double_points: boolean
  prediction: { team_a_score: number; team_b_score: number; points: number | null }
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
  const [predictions, setPredictions] = useState<PlayerPrediction[]>([])
  const [loading, setLoading] = useState(true)

  const fetchHistory = useCallback(async (tab: TabId) => {
    setLoading(true)
    try {
      const roundId = (tab === 'overall' || tab === 'rivals') ? undefined : (tab as number)
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

  useEffect(() => {
    fetchHistory('overall')
    playersAPI.getPlayerPredictions(player.user.id)
      .then(res => setPredictions(res.data))
      .catch(() => setPredictions([]))
  }, [fetchHistory, player.user.id])

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

      {/* Game-by-game predictions table */}
      {(() => {
        const roundId = (histTab === 'overall' || histTab === 'rivals') ? null : (histTab as number)
        const filtered = predictions.filter(p =>
          p.is_scored && (roundId === null || p.competition_round?.id === roundId)
        )
        if (filtered.length === 0) return null
        const totalPts = filtered.reduce((sum, p) => sum + (p.prediction.points ?? 0), 0)
        return (
          <div className="ph-games-section">
            <h3 className="ph-games-title">
              Games · <span className="ph-games-pts">{totalPts} pts</span>
            </h3>
            <div className="ph-games-table-wrap">
              <table className="ph-games-table">
                <thead>
                  <tr>
                    <th>Game</th>
                    <th>Result</th>
                    <th>Predicted</th>
                    <th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.game_id}>
                      <td className="ph-game-teams">
                        {p.team_a.name} v {p.team_b.name}
                        {p.is_double_points && <span className="ph-double-badge">×2</span>}
                      </td>
                      <td className="ph-score">{p.team_a.score}–{p.team_b.score}</td>
                      <td className="ph-score">{p.prediction.team_a_score}–{p.prediction.team_b_score}</td>
                      <td className={`ph-pts ph-pts--${(p.prediction.points ?? 0) > 0 ? 'pos' : 'zero'}`}>
                        {p.prediction.points ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ── Rivals tab view ───────────────────────────────────────────────────────────

function RivalsView({
  overallRankings,
  rivals,
  currentUserId,
  onToggleRival,
  onSelectPlayer,
}: {
  overallRankings: Ranking[]
  rivals: number[]
  currentUserId: number
  onToggleRival: (rivalId: number, isRival: boolean) => void
  onSelectPlayer: (r: Ranking) => void
  search: string
}) {
  const filtered = overallRankings
    .filter(r => r.user.id === currentUserId || rivals.includes(r.user.id))
    .filter(r =>
      search === '' ||
      r.user.username.toLowerCase().includes(search.toLowerCase()) ||
      r.user.first_name.toLowerCase().includes(search.toLowerCase()) ||
      r.user.surname.toLowerCase().includes(search.toLowerCase())
    )

  const myEntry = filtered.find(r => r.user.id === currentUserId)
  const myPoints = myEntry?.total_points ?? 0

  if (rivals.length === 0) {
    return (
      <p className="rivals-empty-state">
        Click ★ next to any player to add them as a rival.
      </p>
    )
  }

  return (
    <div className="rankings-table-wrap">
      <p className="rankings-click-hint">Showing you vs your rivals · click a player for their history</p>
      <table className="rankings-table">
        <thead>
          <tr>
            <th className="col-rank">#</th>
            <th className="col-player">Player</th>
            <th className="col-points">Points</th>
            <th className="col-delta">vs me</th>
            <th className="col-rank">Overall</th>
            <th className="col-rival-star" aria-label="Rivals"></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r, idx) => {
            const isMe = r.user.id === currentUserId
            const delta = r.total_points - myPoints
            const isRival = rivals.includes(r.user.id)
            return (
              <tr
                key={r.user.id}
                className={`ranking-row-clickable${isMe ? ' row-me' : ''}`}
                onClick={() => onSelectPlayer(r)}
                title="View ranking history"
              >
                <td className="col-rank">{idx + 1}</td>
                <td className="col-player">
                  <span className="player-username">{r.user.username}</span>
                  <span className="player-fullname">{r.user.first_name} {r.user.surname}</span>
                </td>
                <td className="col-points">{r.total_points}</td>
                <td className="col-delta">
                  {isMe ? (
                    <span className="rivals-delta rivals-delta--neutral">—</span>
                  ) : delta > 0 ? (
                    <span className="rivals-delta rivals-delta--positive">+{delta}</span>
                  ) : delta < 0 ? (
                    <span className="rivals-delta rivals-delta--negative">{delta}</span>
                  ) : (
                    <span className="rivals-delta rivals-delta--neutral">0</span>
                  )}
                </td>
                <td className="col-rank">#{r.rank}</td>
                <td className="col-rival-star">
                  {!isMe && (
                    <button
                      className={`rival-star${isRival ? ' rival-star--active' : ''}`}
                      title={isRival ? 'Remove rival' : 'Add rival'}
                      onClick={e => { e.stopPropagation(); onToggleRival(r.user.id, isRival) }}
                      aria-label={isRival ? 'Remove rival' : 'Add rival'}
                    >
                      {isRival ? '★' : '☆'}
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main rankings page ────────────────────────────────────────────────────────

export default function RankingsPage() {
  const { user } = useAuthStore()

  const [rounds, setRounds] = useState<CompetitionRound[]>([])
  const [activeTab, setActiveTab] = useState<TabId>('overall')
  const [rankings, setRankings] = useState<Ranking[]>([])
  const [overallRankings, setOverallRankings] = useState<Ranking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cache, setCache] = useState<Record<string, Ranking[]>>({})
  const [rivals, setRivals] = useState<number[]>([])

  // Selected player for history view
  const [selectedPlayer, setSelectedPlayer] = useState<Ranking | null>(null)
  const [search, setSearch] = useState('')

  // Ref for scrolling to current user's row
  const myRowRef = useRef<HTMLTableRowElement | null>(null)

  useEffect(() => {
    setLoading(true)
    setError('')
    setActiveTab('overall')
    setSelectedPlayer(null)
    const init = async () => {
      try {
        const [roundsRes, overallRes] = await Promise.all([
          rankingsAPI.getRounds(),
          rankingsAPI.getOverall(),
        ])
        const fetchedRounds: CompetitionRound[] = roundsRes.data
        setRounds(fetchedRounds)
        const overall: Ranking[] = overallRes.data
        setRankings(overall)
        setOverallRankings(overall)
        const initialCache: Record<string, Ranking[]> = { overall }
        setCache(initialCache)
        // Preload all round rankings in background so rank badges show immediately
        const roundResults = await Promise.allSettled(
          fetchedRounds.map(r => rankingsAPI.getRound(r.id))
        )
        const fullCache: Record<string, Ranking[]> = { overall }
        fetchedRounds.forEach((r, i) => {
          const res = roundResults[i]
          if (res.status === 'fulfilled') fullCache[String(r.id)] = res.value.data
        })
        setCache(fullCache)
      } catch {
        setError('Failed to load rankings. Please refresh.')
      }
      try {
        const rivalsRes = await rivalsAPI.get()
        setRivals(rivalsRes.data)
      } catch {
        // rivals fetch failing should not block the rankings page
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const handleTabChange = async (tab: TabId) => {
    setActiveTab(tab)
    setSelectedPlayer(null)
    setSearch('')
    if (tab === 'rivals') return
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

  const handleToggleRival = async (rivalId: number, isRival: boolean) => {
    // Optimistic update
    if (isRival) {
      setRivals(prev => prev.filter(id => id !== rivalId))
      try { await rivalsAPI.remove(rivalId) } catch { setRivals(prev => [...prev, rivalId]) }
    } else {
      setRivals(prev => [...prev, rivalId])
      try { await rivalsAPI.add(rivalId) } catch { setRivals(prev => prev.filter(id => id !== rivalId)) }
    }
  }

  const scrollToMe = () => {
    myRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
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

  const myRow = rankings.find(r => r.user.id === user?.id)

  // Derive my rank for each cached tab (overall + any loaded round)
  const myRankByTab: Record<string, number> = {}
  Object.entries(cache).forEach(([key, rows]) => {
    const me = rows.find(r => r.user.id === user?.id)
    if (me) myRankByTab[key] = me.rank
  })

  return (
    <div className="rankings-page">
      <div className="rankings-header">
        <h2 className="page-title" style={{ margin: 0 }}>Rankings</h2>
        <input
          className="admin-search"
          placeholder="Search player…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="page-tabs">
        <button
          className={`tab-btn${activeTab === 'overall' ? ' active' : ''}`}
          onClick={() => handleTabChange('overall')}
        >
          Overall
          {myRankByTab['overall'] != null && (
            <span className="tab-my-rank">#{myRankByTab['overall']}</span>
          )}
        </button>
        {rounds.map((round) => (
          <button
            key={round.id}
            className={`tab-btn${activeTab === round.id ? ' active' : ''}${round.is_current ? ' tab-btn--current' : ''}`}
            onClick={() => handleTabChange(round.id)}
          >
            {round.name}
            {myRankByTab[String(round.id)] != null && (
              <span className="tab-my-rank">#{myRankByTab[String(round.id)]}</span>
            )}
          </button>
        ))}
        <button
          className={`tab-btn tab-btn--rivals${activeTab === 'rivals' ? ' active' : ''}`}
          onClick={() => handleTabChange('rivals')}
        >
          Rivals
          {rivals.length > 0 && (
            <span className="tab-rivals-count">{rivals.length}</span>
          )}
        </button>
      </div>

      {loading && <p className="loading-text">Loading rankings...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && activeTab === 'rivals' && (
        <>
          <RivalsView
            overallRankings={overallRankings}
            rivals={rivals}
            currentUserId={user!.id}
            onToggleRival={handleToggleRival}
            onSelectPlayer={setSelectedPlayer}
            search={search}
          />
        </>
      )}

      {!loading && !error && activeTab !== 'rivals' && rankings.length === 0 && (
        <p className="empty-state">No rankings yet — they update after each game is scored.</p>
      )}

      {!loading && !error && activeTab !== 'rivals' && rankings.length > 0 && (
        <>
          {myRow && (
            <div className="my-rank-card">
              <span className="my-rank-label">Your position</span>
              <span className="my-rank-position">#{myRow.rank}</span>
              <span className="my-rank-separator">·</span>
              <span className="my-rank-points">{myRow.total_points} pts</span>
              <button className="my-rank-scroll-btn" onClick={scrollToMe}>
                Scroll to my row ↓
              </button>
            </div>
          )}
          <p className="rankings-click-hint">Click any player to view their ranking history</p>
          <div className="rankings-table-wrap">
          <table className="rankings-table">
            <thead>
              <tr>
                <th className="col-rank">#</th>
                <th className="col-player">Player</th>
                <th className="col-points">Points</th>
                <th className="col-trend">Trend</th>
                <th className="col-rival-star" aria-label="Rivals"></th>
              </tr>
            </thead>
            <tbody>
              {rankings.filter(r =>
                search === '' ||
                r.user.username.toLowerCase().includes(search.toLowerCase()) ||
                r.user.first_name.toLowerCase().includes(search.toLowerCase()) ||
                r.user.surname.toLowerCase().includes(search.toLowerCase())
              ).map((r) => {
                const isMe = r.user.id === user?.id
                const isRival = rivals.includes(r.user.id)
                return (
                  <tr
                    key={r.user.id}
                    ref={isMe ? myRowRef : undefined}
                    className={`ranking-row-clickable${isMe ? ' row-me' : ''}`}
                    onClick={() => setSelectedPlayer(r)}
                    title="View ranking history"
                  >
                    <td className="col-rank">
                      {r.rank <= 5
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
                    <td className="col-rival-star">
                      {!isMe && (
                        <button
                          className={`rival-star${isRival ? ' rival-star--active' : ''}`}
                          title={isRival ? 'Remove rival' : 'Add rival'}
                          onClick={e => { e.stopPropagation(); handleToggleRival(r.user.id, isRival) }}
                          aria-label={isRival ? 'Remove rival' : 'Add rival'}
                        >
                          {isRival ? '★' : '☆'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  )
}
