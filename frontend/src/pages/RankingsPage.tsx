import { useState, useEffect } from 'react'
import { rankingsAPI } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import { Ranking, CompetitionRound } from '../types'

type TabId = 'overall' | number

function TrendIcon({ rank, previous }: { rank: number; previous?: number | null }) {
  if (previous == null) return <span className="trend trend--neutral">—</span>
  if (rank < previous) return <span className="trend trend--up">▲</span>
  if (rank > previous) return <span className="trend trend--down">▼</span>
  return <span className="trend trend--neutral">—</span>
}

export default function RankingsPage() {
  const { user } = useAuthStore()

  const [rounds, setRounds] = useState<CompetitionRound[]>([])
  const [activeTab, setActiveTab] = useState<TabId>('overall')
  const [rankings, setRankings] = useState<Ranking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Cache rankings per tab to avoid redundant fetches
  const [cache, setCache] = useState<Record<string, Ranking[]>>({})

  // Load rounds on mount, then load overall ranking
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
    const key = tab === 'overall' ? 'overall' : String(tab)

    if (cache[key]) {
      setRankings(cache[key])
      return
    }

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

  return (
    <div className="rankings-page">
      <h2 className="page-title">Rankings</h2>

      <div className="page-tabs">
        <button
          className={`tab-btn${activeTab === 'overall' ? ' active' : ''}`}
          onClick={() => handleTabChange('overall')}
        >
          Overall
        </button>
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
                  <tr key={r.user.id} className={isMe ? 'row-me' : ''}>
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
