import { useState, useEffect, useCallback, useMemo } from 'react'
import { gamesAPI, predictionsAPI, playersAPI } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import { Game, Prediction } from '../types'
import { usePullToRefresh } from '../hooks/usePullToRefresh'

type Tab = 'open' | 'past' | 'others'

interface GameInput {
  teamA: string
  teamB: string
  status: 'idle' | 'saving' | 'saved' | 'error'
  errorMsg?: string
  existed: boolean  // true if a saved prediction was returned by the API
  touched: boolean  // true once the user has edited the inputs
}

interface Player {
  id: number
  username: string
  first_name: string
  surname: string
}

interface PlayerGamePrediction {
  game_id: number
  team_a: { id: number; name: string; score: number | null }
  team_b: { id: number; name: string; score: number | null }
  game_date: string
  location: string
  stage?: string
  group?: string
  competition_round?: { id: number; name: string }
  is_scored: boolean
  is_double_points: boolean
  prediction: { team_a_score: number; team_b_score: number; points: number | null }
}

function formatGameDate(isoDate: string, timezone: string): string {
  return new Date(isoDate).toLocaleString('en-GB', {
    timeZone: timezone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDeadline(isoDate: string, timezone: string): string {
  return new Date(isoDate).toLocaleString('en-GB', {
    timeZone: timezone,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function pointsLabel(points: number | null | undefined): string {
  if (points == null) return '—'
  return `${points} pt${points !== 1 ? 's' : ''}`
}

function GameCardHeader({ game }: { game: Game | PlayerGamePrediction }) {
  const stage = game.stage
  const group = game.group
  return (
    <div className="game-card-header">
      <span className="game-round">{game.competition_round?.name}</span>
      {stage && (
        <span className="game-stage">
          {stage}{group && !stage.includes(group) ? ` — Group ${group}` : ''}
        </span>
      )}
      {game.is_double_points && <span className="double-points-badge">2x Points</span>}
    </div>
  )
}

export default function PredictionsPage() {
  const { user } = useAuthStore()
  const timezone = user?.timezone || 'UTC'

  const [tab, setTab] = useState<Tab>('open')

  // Open games (formerly upcoming)
  const [openGames, setOpenGames] = useState<Game[]>([])
  const [inputs, setInputs] = useState<Record<number, GameInput>>({})
  const [openLoading, setOpenLoading] = useState(true)
  const [openError, setOpenError] = useState('')

  // Past games
  const [pastGames, setPastGames] = useState<Game[]>([])
  const [pastPredictions, setPastPredictions] = useState<Record<number, Prediction>>({})
  const [pastLoading, setPastLoading] = useState(false)
  const [pastError, setPastError] = useState('')
  const [pastLoaded, setPastLoaded] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Game predictions page-view (selected closed game → show all predictions)
  const [selectedClosedGame, setSelectedClosedGame] = useState<Game | null>(null)
  const [closedGamePreds, setClosedGamePreds] = useState<any[] | null>(null)
  const [closedGamePredsLoading, setClosedGamePredsLoading] = useState(false)
  const [closedGameSearch, setClosedGameSearch] = useState('')

  const openGamePredictions = useCallback(async (game: Game) => {
    setSelectedClosedGame(game)
    setClosedGameSearch('')
    setClosedGamePreds(null)
    setClosedGamePredsLoading(true)
    try {
      const res = await predictionsAPI.getGamePredictions(game.id)
      setClosedGamePreds(res.data)
    } catch {
      setClosedGamePreds([])
    } finally {
      setClosedGamePredsLoading(false)
    }
  }, [])

  const closeGamePredictions = useCallback(() => {
    setSelectedClosedGame(null)
    setClosedGamePreds(null)
    setClosedGameSearch('')
  }, [])

  // Other players
  const [players, setPlayers] = useState<Player[]>([])
  const [playersLoaded, setPlayersLoaded] = useState(false)
  const [playerSearch, setPlayerSearch] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [playerPredictions, setPlayerPredictions] = useState<PlayerGamePrediction[]>([])
  const [playerPredsLoading, setPlayerPredsLoading] = useState(false)
  const [playerPredsError, setPlayerPredsError] = useState('')

  // Load open games on mount or refresh
  useEffect(() => {
    setOpenLoading(true)
    setOpenError('')
    const load = async () => {
      try {
        const [gamesRes, predsRes] = await Promise.all([
          gamesAPI.getUpcoming(),
          predictionsAPI.getPredictions(),
        ])
        const games: Game[] = gamesRes.data
        const predsMap: Record<number, Prediction> = {}
        predsRes.data.forEach((p: Prediction) => { predsMap[p.game_id] = p })
        setOpenGames(games)
        const initialInputs: Record<number, GameInput> = {}
        games.forEach((g) => {
          const pred = predsMap[g.id]
          initialInputs[g.id] = {
            teamA: pred != null ? String(pred.team_a_score) : '0',
            teamB: pred != null ? String(pred.team_b_score) : '0',
            status: 'idle',
            existed: pred != null,
            touched: false,
          }
        })
        setInputs(initialInputs)
      } catch {
        setOpenError('Failed to load games. Please refresh.')
      } finally {
        setOpenLoading(false)
      }
    }
    load()
  }, [refreshKey])

  const onRefresh = useCallback(async () => {
    setPastLoaded(false)
    setRefreshKey((k) => k + 1)
  }, [])

  const { isPulling, pullDistance, isRefreshing, threshold } = usePullToRefresh(onRefresh)

  // Load past games lazily
  const loadPast = useCallback(async () => {
    if (pastLoaded) return
    setPastLoading(true)
    try {
      const [gamesRes, predsRes] = await Promise.all([
        gamesAPI.getClosed(),
        predictionsAPI.getPredictions(),
      ])
      const predsMap: Record<number, Prediction> = {}
      predsRes.data.forEach((p: Prediction) => { predsMap[p.game_id] = p })
      setPastGames(gamesRes.data)
      setPastPredictions(predsMap)
      setPastLoaded(true)
    } catch {
      setPastError('Failed to load past games. Please refresh.')
    } finally {
      setPastLoading(false)
    }
  }, [pastLoaded])

  // Load player list lazily
  const loadPlayers = useCallback(async () => {
    if (playersLoaded) return
    try {
      const res = await playersAPI.getAll()
      // Exclude self
      setPlayers(res.data.filter((p: Player) => p.id !== user?.id))
      setPlayersLoaded(true)
    } catch {
      // silent — search will just show empty
    }
  }, [playersLoaded, user?.id])

  const handleTabChange = (t: Tab) => {
    setTab(t)
    if (t === 'past') loadPast()
    if (t === 'others') loadPlayers()
  }

  const handleInput = (gameId: number, side: 'teamA' | 'teamB', value: string) => {
    if (value !== '' && !/^\d+$/.test(value)) return
    setInputs((prev) => ({
      ...prev,
      [gameId]: { ...prev[gameId], [side]: value, status: 'idle', errorMsg: undefined, touched: true },
    }))
  }

  const handleSave = async (gameId: number) => {
    const input = inputs[gameId]
    if (!input) return
    if (input.teamA === '' || input.teamB === '') {
      setInputs((prev) => ({
        ...prev,
        [gameId]: { ...prev[gameId], status: 'error', errorMsg: 'Both scores are required' },
      }))
      return
    }
    setInputs((prev) => ({ ...prev, [gameId]: { ...prev[gameId], status: 'saving' } }))
    try {
      await predictionsAPI.createPrediction({
        game_id: gameId,
        team_a_score: parseInt(input.teamA),
        team_b_score: parseInt(input.teamB),
      })
      setInputs((prev) => ({ ...prev, [gameId]: { ...prev[gameId], status: 'saved', existed: true } }))
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to save. Please try again.'
      setInputs((prev) => ({ ...prev, [gameId]: { ...prev[gameId], status: 'error', errorMsg: msg } }))
    }
  }

  const handleSelectPlayer = async (player: Player) => {
    setSelectedPlayer(player)
    setPlayerPredictions([])
    setPlayerPredsError('')
    setPlayerPredsLoading(true)
    try {
      const res = await playersAPI.getPlayerPredictions(player.id)
      setPlayerPredictions(res.data)
    } catch {
      setPlayerPredsError('Failed to load predictions for this player.')
    } finally {
      setPlayerPredsLoading(false)
    }
  }

  const filteredPlayers = useMemo(() => {
    const q = playerSearch.trim().toLowerCase()
    if (!q) return players
    return players.filter(
      (p) =>
        p.username.toLowerCase().includes(q) ||
        p.first_name.toLowerCase().includes(q)
    )
  }, [players, playerSearch])

  return (
    <div className="predictions-page">
      {(isPulling || isRefreshing) && (
        <div className="pull-indicator">
          {isRefreshing ? 'Refreshing...' : pullDistance >= threshold ? 'Release to refresh' : 'Pull down to refresh'}
        </div>
      )}
      <div className="page-tabs">
        <button
          className={`tab-btn${tab === 'open' ? ' active' : ''}`}
          onClick={() => handleTabChange('open')}
        >
          Open Games
        </button>
        <button
          className={`tab-btn${tab === 'past' ? ' active' : ''}`}
          onClick={() => handleTabChange('past')}
        >
          Closed Games
        </button>
        <button
          className={`tab-btn${tab === 'others' ? ' active' : ''}`}
          onClick={() => handleTabChange('others')}
        >
          Other Players
        </button>
      </div>

      {/* ── Open Games ── */}
      {tab === 'open' && (
        <div className="tab-content">
          {!user?.has_paid && (
            <div className="payment-warning">
              Your registration fee has not been recorded yet. You can view upcoming games but cannot submit predictions until payment is confirmed.
            </div>
          )}
          {openLoading && <p className="loading-text">Loading games...</p>}
          {openError && <p className="error">{openError}</p>}
          {!openLoading && !openError && openGames.length === 0 && (
            <p className="empty-state">No upcoming games open for predictions.</p>
          )}
          <div className="games-list">
            {openGames.map((game) => {
              const input = inputs[game.id] || { teamA: '0', teamB: '0', status: 'idle', existed: false, touched: false }
              const isDefault = !input.existed && !input.touched
              return (
                <div key={game.id} className={`game-card${game.is_double_points ? ' double-points' : ''}`}>
                  <GameCardHeader game={game} />
                  <div className="game-teams">
                    <span className="team-name">{game.team_a.name}</span>
                    <span className="vs">vs</span>
                    <span className="team-name">{game.team_b.name}</span>
                  </div>
                  <div className="game-meta">
                    <span>{formatGameDate(game.game_date, timezone)}</span>
                    <span className="separator">·</span>
                    <span>{game.location}</span>
                  </div>
                  <div className="game-deadline">
                    Deadline: {formatDeadline(game.prediction_deadline, timezone)}
                  </div>
                  <div className="prediction-input-row">
                    <div className="prediction-inputs">
                      <div className="score-input-group">
                        <label>{game.team_a.name}</label>
                        <input
                          type="number" min="0" value={input.teamA} placeholder="0"
                          onChange={(e) => handleInput(game.id, 'teamA', e.target.value)}
                          disabled={!user?.has_paid || input.status === 'saving'}
                          className={`score-input${isDefault ? ' score-input--default' : ''}`}
                        />
                      </div>
                      <span className="score-separator">—</span>
                      <div className="score-input-group">
                        <label>{game.team_b.name}</label>
                        <input
                          type="number" min="0" value={input.teamB} placeholder="0"
                          onChange={(e) => handleInput(game.id, 'teamB', e.target.value)}
                          disabled={!user?.has_paid || input.status === 'saving'}
                          className={`score-input${isDefault ? ' score-input--default' : ''}`}
                        />
                      </div>
                    </div>
                    {user?.has_paid && (
                      <button
                        className={`save-btn save-btn--${input.status}`}
                        onClick={() => handleSave(game.id)}
                        disabled={input.status === 'saving'}
                      >
                        {input.status === 'saving' ? 'Saving...'
                          : input.status === 'saved' ? '✓ Saved'
                          : input.existed ? 'Update' : 'Save'}
                      </button>
                    )}
                  </div>
                  {input.status === 'error' && (
                    <p className="prediction-error">{input.errorMsg}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Closed Games ── */}
      {tab === 'past' && (
        <div className="tab-content">

          {/* ── Game predictions detail view ── */}
          {selectedClosedGame && (() => {
            const game = selectedClosedGame
            const pred = pastPredictions[game.id]
            const all  = closedGamePreds ?? []
            const sorted = [...all].sort((a, b) =>
              game.is_scored
                ? (b.points ?? -1) - (a.points ?? -1)
                : a.username.localeCompare(b.username)
            )
            const q = closedGameSearch.toLowerCase()
            const filtered = q ? sorted.filter(p => p.username.toLowerCase().includes(q)) : sorted

            // Stats
            const n = all.length
            const homeW = all.filter((p: any) => p.team_a_score > p.team_b_score).length
            const draws = all.filter((p: any) => p.team_a_score === p.team_b_score).length
            const awayW = all.filter((p: any) => p.team_a_score < p.team_b_score).length
            const scoreMap: Record<string, number> = {}
            all.forEach((p: any) => {
              const k = `${p.team_a_score}–${p.team_b_score}`
              scoreMap[k] = (scoreMap[k] || 0) + 1
            })
            const topScore = n > 0
              ? Object.entries(scoreMap).sort((a, b) => b[1] - a[1])[0]
              : null

            let exact = 0, correctResult = 0
            if (game.is_scored && game.team_a.score != null && game.team_b.score != null) {
              const ao = game.team_a.score > game.team_b.score ? 'h' : game.team_a.score < game.team_b.score ? 'a' : 'd'
              all.forEach((p: any) => {
                if (p.team_a_score === game.team_a.score && p.team_b_score === game.team_b.score) exact++
                else {
                  const po = p.team_a_score > p.team_b_score ? 'h' : p.team_a_score < p.team_b_score ? 'a' : 'd'
                  if (po === ao) correctResult++
                }
              })
            }

            return (
              <div className="gp-page">
                <button className="back-btn" onClick={closeGamePredictions}>← Back to Closed Games</button>

                {/* Game header */}
                <div className={`game-card${game.is_double_points ? ' double-points' : ''}`} style={{ marginBottom: '1.25rem' }}>
                  <GameCardHeader game={game} />
                  <div className="game-teams">
                    <span className="team-name">{game.team_a.name}</span>
                    <span className="vs">vs</span>
                    <span className="team-name">{game.team_b.name}</span>
                  </div>
                  <div className="game-meta">
                    <span>{formatGameDate(game.game_date, timezone)}</span>
                    <span className="separator">·</span>
                    <span>{game.location}</span>
                  </div>
                  <div className="past-results-row">
                    <div className="result-block">
                      <span className="result-label">Result</span>
                      <span className="result-value">
                        {game.is_scored ? `${game.team_a.score ?? '?'} – ${game.team_b.score ?? '?'}` : 'Not yet'}
                      </span>
                    </div>
                    <div className="result-block">
                      <span className="result-label">Your prediction</span>
                      <span className="result-value">
                        {pred ? `${pred.team_a_score} – ${pred.team_b_score}` : <span className="no-prediction">—</span>}
                      </span>
                    </div>
                    {game.is_scored && pred && (
                      <div className="result-block points-block">
                        <span className="result-label">Your points</span>
                        <span className="result-value points-value">{pointsLabel(pred.points)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {closedGamePredsLoading && <p className="loading-text">Loading predictions…</p>}

                {!closedGamePredsLoading && closedGamePreds !== null && (
                  <>
                    {/* Stats row */}
                    {n > 0 && (
                      <div className="gp-stats-row">
                        <div className="gp-stat">
                          <span className="gp-stat-value">{n}</span>
                          <span className="gp-stat-label">predictions</span>
                        </div>
                        {topScore && (
                          <div className="gp-stat">
                            <span className="gp-stat-value">{topScore[0]}</span>
                            <span className="gp-stat-label">most popular ({topScore[1]}×)</span>
                          </div>
                        )}
                        <div className="gp-stat">
                          <span className="gp-stat-value">{homeW}</span>
                          <span className="gp-stat-label">{game.team_a.name} win</span>
                        </div>
                        <div className="gp-stat">
                          <span className="gp-stat-value">{draws}</span>
                          <span className="gp-stat-label">draw</span>
                        </div>
                        <div className="gp-stat">
                          <span className="gp-stat-value">{awayW}</span>
                          <span className="gp-stat-label">{game.team_b.name} win</span>
                        </div>
                        {game.is_scored && (
                          <>
                            <div className="gp-stat gp-stat-exact">
                              <span className="gp-stat-value">{exact}</span>
                              <span className="gp-stat-label">exact score</span>
                            </div>
                            <div className="gp-stat">
                              <span className="gp-stat-value">{correctResult}</span>
                              <span className="gp-stat-label">correct result</span>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Search + table */}
                    <div className="game-predictions-header">
                      <span className="gp-count">{n} prediction{n !== 1 ? 's' : ''}</span>
                      <input
                        className="gp-search"
                        placeholder="Search player…"
                        value={closedGameSearch}
                        onChange={e => setClosedGameSearch(e.target.value)}
                      />
                    </div>

                    {n === 0
                      ? <p className="empty-state">No predictions submitted for this game.</p>
                      : filtered.length === 0
                        ? <p className="empty-state">No matching players.</p>
                        : <table className="game-predictions-table">
                            <thead>
                              <tr>
                                <th>Player</th>
                                <th>Prediction</th>
                                {game.is_scored && <th>Points</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {filtered.map((p: any) => (
                                <tr key={p.user_id} className={p.username === user?.username ? 'gp-row-self' : ''}>
                                  <td>{p.username}</td>
                                  <td>{p.team_a_score} – {p.team_b_score}</td>
                                  {game.is_scored && <td>{pointsLabel(p.points)}</td>}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                    }
                  </>
                )}
              </div>
            )
          })()}

          {/* ── Game list (shown when no game selected) ── */}
          {!selectedClosedGame && (
            <>
              {pastLoading && <p className="loading-text">Loading past games...</p>}
              {pastError && <p className="error">{pastError}</p>}
              {!pastLoading && !pastError && pastGames.length === 0 && (
                <p className="empty-state">No past games yet.</p>
              )}
              <div className="games-list">
                {pastGames.map((game) => {
                  const pred = pastPredictions[game.id]
                  return (
                    <div key={game.id} className={`game-card${game.is_double_points ? ' double-points' : ''}`}>
                      <GameCardHeader game={game} />
                      <div className="game-teams">
                        <span className="team-name">{game.team_a.name}</span>
                        <span className="vs">vs</span>
                        <span className="team-name">{game.team_b.name}</span>
                      </div>
                      <div className="game-meta">
                        <span>{formatGameDate(game.game_date, timezone)}</span>
                        <span className="separator">·</span>
                        <span>{game.location}</span>
                      </div>
                      <div className="past-results-row">
                        <div className="result-block">
                          <span className="result-label">Result</span>
                          <span className="result-value">
                            {game.is_scored
                              ? `${game.team_a.score ?? '?'} – ${game.team_b.score ?? '?'}`
                              : 'Not yet'}
                          </span>
                        </div>
                        <div className="result-block">
                          <span className="result-label">Your prediction</span>
                          <span className="result-value">
                            {pred
                              ? `${pred.team_a_score} – ${pred.team_b_score}`
                              : <span className="no-prediction">No prediction</span>}
                          </span>
                        </div>
                        {game.is_scored && (
                          <div className="result-block points-block">
                            <span className="result-label">Points</span>
                            <span className="result-value points-value">
                              {pred ? pointsLabel(pred.points) : '0 pts'}
                            </span>
                          </div>
                        )}
                      </div>
                      <button
                        className="game-predictions-toggle"
                        onClick={() => openGamePredictions(game)}
                      >
                        View predictions →
                      </button>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Other Players ── */}
      {tab === 'others' && (
        <div className="tab-content">
          <input
            type="text"
            className="player-search"
            placeholder="Search by username or first name…"
            value={playerSearch}
            onChange={(e) => { setPlayerSearch(e.target.value); setSelectedPlayer(null) }}
          />

          {!selectedPlayer && (
            <div className="other-player-list">
              {filteredPlayers.length === 0 && playerSearch && (
                <p className="empty-state">No players found.</p>
              )}
              {filteredPlayers.map((p) => (
                <button
                  key={p.id}
                  className="other-player-btn"
                  onClick={() => handleSelectPlayer(p)}
                >
                  <span className="player-username">{p.username}</span>
                  <span className="player-fullname">{p.first_name} {p.surname}</span>
                </button>
              ))}
            </div>
          )}

          {selectedPlayer && (
            <div className="other-player-predictions">
              <div className="other-player-header">
                <button className="back-btn" onClick={() => setSelectedPlayer(null)}>
                  ← Back
                </button>
                <span className="other-player-name">
                  {selectedPlayer.username} — {selectedPlayer.first_name} {selectedPlayer.surname}
                </span>
              </div>

              {playerPredsLoading && <p className="loading-text">Loading predictions...</p>}
              {playerPredsError && <p className="error">{playerPredsError}</p>}
              {!playerPredsLoading && !playerPredsError && playerPredictions.length === 0 && (
                <p className="empty-state">No predictions recorded for this player yet.</p>
              )}

              <div className="games-list">
                {playerPredictions.map((item) => (
                  <div key={item.game_id} className={`game-card${item.is_double_points ? ' double-points' : ''}`}>
                    <div className="game-card-header">
                      <span className="game-round">{item.competition_round?.name}</span>
                      {item.stage && (
                        <span className="game-stage">
                          {item.stage}{item.group && !item.stage.includes(item.group) ? ` — Group ${item.group}` : ''}
                        </span>
                      )}
                      {item.is_double_points && <span className="double-points-badge">2x Points</span>}
                    </div>
                    <div className="game-teams">
                      <span className="team-name">{item.team_a.name}</span>
                      <span className="vs">vs</span>
                      <span className="team-name">{item.team_b.name}</span>
                    </div>
                    <div className="game-meta">
                      <span>{formatGameDate(item.game_date, timezone)}</span>
                      <span className="separator">·</span>
                      <span>{item.location}</span>
                    </div>
                    <div className="past-results-row">
                      <div className="result-block">
                        <span className="result-label">Result</span>
                        <span className="result-value">
                          {item.is_scored
                            ? `${item.team_a.score ?? '?'} – ${item.team_b.score ?? '?'}`
                            : 'Not yet'}
                        </span>
                      </div>
                      <div className="result-block">
                        <span className="result-label">{selectedPlayer.username}'s prediction</span>
                        <span className="result-value">
                          {item.prediction.team_a_score} – {item.prediction.team_b_score}
                        </span>
                      </div>
                      {item.is_scored && (
                        <div className="result-block points-block">
                          <span className="result-label">Points</span>
                          <span className="result-value points-value">
                            {pointsLabel(item.prediction.points)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
