import { useState, useEffect, useCallback, useMemo } from 'react'
import { gamesAPI, predictionsAPI, playersAPI } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import { Game, Prediction } from '../types'

type Tab = 'open' | 'past' | 'others'

interface GameInput {
  teamA: string
  teamB: string
  status: 'idle' | 'saving' | 'saved' | 'error'
  errorMsg?: string
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

  // Game predictions (all players for a selected closed game)
  const [expandedGameId, setExpandedGameId] = useState<number | null>(null)
  const [gamePredictions, setGamePredictions] = useState<Record<number, any[]>>({})
  const [gamePredictionsLoading, setGamePredictionsLoading] = useState<number | null>(null)

  const toggleGamePredictions = useCallback(async (gameId: number) => {
    if (expandedGameId === gameId) { setExpandedGameId(null); return }
    setExpandedGameId(gameId)
    if (gamePredictions[gameId]) return  // already cached
    setGamePredictionsLoading(gameId)
    try {
      const res = await predictionsAPI.getGamePredictions(gameId)
      setGamePredictions(prev => ({ ...prev, [gameId]: res.data }))
    } catch {
      setGamePredictions(prev => ({ ...prev, [gameId]: [] }))
    } finally {
      setGamePredictionsLoading(null)
    }
  }, [expandedGameId, gamePredictions])

  // Other players
  const [players, setPlayers] = useState<Player[]>([])
  const [playersLoaded, setPlayersLoaded] = useState(false)
  const [playerSearch, setPlayerSearch] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [playerPredictions, setPlayerPredictions] = useState<PlayerGamePrediction[]>([])
  const [playerPredsLoading, setPlayerPredsLoading] = useState(false)
  const [playerPredsError, setPlayerPredsError] = useState('')

  // Load open games on mount
  useEffect(() => {
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
            teamA: pred != null ? String(pred.team_a_score) : '',
            teamB: pred != null ? String(pred.team_b_score) : '',
            status: 'idle',
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
  }, [])

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
      [gameId]: { ...prev[gameId], [side]: value, status: 'idle', errorMsg: undefined },
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
      setInputs((prev) => ({ ...prev, [gameId]: { ...prev[gameId], status: 'saved' } }))
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
              const input = inputs[game.id] || { teamA: '', teamB: '', status: 'idle' }
              const hasPrediction = input.teamA !== '' || input.teamB !== ''
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
                          className="score-input"
                        />
                      </div>
                      <span className="score-separator">—</span>
                      <div className="score-input-group">
                        <label>{game.team_b.name}</label>
                        <input
                          type="number" min="0" value={input.teamB} placeholder="0"
                          onChange={(e) => handleInput(game.id, 'teamB', e.target.value)}
                          disabled={!user?.has_paid || input.status === 'saving'}
                          className="score-input"
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
                          : hasPrediction ? 'Update' : 'Save'}
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

                  {/* View all predictions toggle */}
                  <button
                    className="game-predictions-toggle"
                    onClick={() => toggleGamePredictions(game.id)}
                  >
                    {expandedGameId === game.id ? 'Hide predictions' : 'View all predictions'}
                  </button>

                  {/* Inline predictions panel */}
                  {expandedGameId === game.id && (
                    <div className="game-predictions-panel">
                      {gamePredictionsLoading === game.id && (
                        <p className="loading-text">Loading…</p>
                      )}
                      {!gamePredictionsLoading && gamePredictions[game.id] && (
                        gamePredictions[game.id].length === 0
                          ? <p className="empty-state">No predictions submitted.</p>
                          : <table className="game-predictions-table">
                              <thead>
                                <tr>
                                  <th>Player</th>
                                  <th>Prediction</th>
                                  {game.is_scored && <th>Points</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {gamePredictions[game.id].map((p: any) => (
                                  <tr key={p.user_id} className={p.username === user?.username ? 'gp-row-self' : ''}>
                                    <td>{p.username}</td>
                                    <td>{p.team_a_score} – {p.team_b_score}</td>
                                    {game.is_scored && <td>{pointsLabel(p.points)}</td>}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
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
