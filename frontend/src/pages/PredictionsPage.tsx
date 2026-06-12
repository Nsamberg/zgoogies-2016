import { useState, useEffect, useCallback, useMemo } from 'react'
import { gamesAPI, predictionsAPI, playersAPI, newsAPI, authAPI, teamsAPI } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import { Game, Prediction } from '../types'

interface BannerItem {
  type: 'news' | 'rankings'
  message: string
  linkTo: string
  linkLabel: string
}

function NotificationBanners({ banners, onDismiss }: {
  banners: BannerItem[]
  onDismiss: (type: BannerItem['type']) => void
}) {
  if (banners.length === 0) return null
  return (
    <div className="notif-banners">
      {banners.map(b => (
        <div key={b.type} className={`notif-banner notif-banner--${b.type}`}>
          <span className="notif-banner-icon">{b.type === 'news' ? '📰' : '🏆'}</span>
          <span className="notif-banner-msg">{b.message}</span>
          <a className="notif-banner-link" href={b.linkTo}>{b.linkLabel} →</a>
          <button className="notif-banner-close" onClick={() => onDismiss(b.type)} aria-label="Dismiss">✕</button>
        </div>
      ))}
    </div>
  )
}

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
  tournament_winner_id: number | null
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

  const [banners, setBanners] = useState<BannerItem[]>([])

  // Record this visit server-side (cross-device); get previous visit time to detect new content
  useEffect(() => {
    authAPI.recordPredictionsVisit().then(res => {
      const previousVisit = res.data.previous_visit
      if (!previousVisit) return  // first ever visit — nothing to flag

      const lastDate = new Date(previousVisit)
      Promise.allSettled([
        newsAPI.getAll(),
        gamesAPI.getClosed(),
      ]).then(([newsResult, closedResult]) => {
        const newBanners: BannerItem[] = []

        if (newsResult.status === 'fulfilled') {
          const articles: { created_at: string; title: string }[] = newsResult.value.data
          const newest = articles
            .filter(a => new Date(a.created_at) > lastDate)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
          if (newest) {
            newBanners.push({
              type: 'news',
              message: `New post: "${newest.title}"`,
              linkTo: '/news',
              linkLabel: 'Read',
            })
          }
        }

        if (closedResult.status === 'fulfilled') {
          const games: { scored_at: string | null }[] = closedResult.value.data
          const newlyScored = games.some(
            g => g.scored_at && new Date(g.scored_at) > lastDate
          )
          if (newlyScored) {
            newBanners.push({
              type: 'rankings',
              message: 'New rankings are available!',
              linkTo: '/rankings',
              linkLabel: 'See Rankings',
            })
          }
        }

        setBanners(newBanners)
      })
    }).catch(() => {})  // silent — banners are non-critical
  }, [])

  const dismissBanner = useCallback((type: BannerItem['type']) => {
    setBanners(prev => prev.filter(b => b.type !== type))
  }, [])

  const [tab, setTab] = useState<Tab>('open')
  const [teamSearch, setTeamSearch] = useState('')

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

  // Winner prediction stats + selected player's pick
  const [winnerStats, setWinnerStats] = useState<{ team_id: number; team_name: string; count: number }[]>([])
  const [teams, setTeams] = useState<{ id: number; name: string }[]>([])
  const [selectedPlayerWinnerId, setSelectedPlayerWinnerId] = useState<number | null | undefined>(undefined)
  // undefined = not yet loaded/reset, null = no pick, number = team id

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

  // Load player list lazily, alongside winner stats and teams
  const loadPlayers = useCallback(async () => {
    if (playersLoaded) return
    const [playersRes, statsRes, teamsRes] = await Promise.allSettled([
      playersAPI.getAll(),
      playersAPI.getWinnerPredictions(),
      teamsAPI.getAll(),
    ])
    if (playersRes.status === 'fulfilled') {
      setPlayers(playersRes.value.data.filter((p: Player) => p.id !== user?.id))
      setPlayersLoaded(true)
    }
    if (statsRes.status === 'fulfilled') {
      const sorted = [...statsRes.value.data].sort((a: { count: number }, b: { count: number }) => b.count - a.count)
      setWinnerStats(sorted)
    }
    if (teamsRes.status === 'fulfilled') {
      setTeams(teamsRes.value.data)
    }
  }, [playersLoaded, user?.id])

  const handleTabChange = (t: Tab) => {
    setTab(t)
    setTeamSearch('')
    if (t === 'past') loadPast()
    if (t === 'others') loadPlayers()
  }

  const matchesTeam = (g: { team_a: { name: string }; team_b: { name: string } }) => {
    if (!teamSearch) return true
    const q = teamSearch.toLowerCase()
    return g.team_a.name.toLowerCase().includes(q) || g.team_b.name.toLowerCase().includes(q)
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
    setSelectedPlayerWinnerId(undefined)
    const [predsRes, detailRes] = await Promise.allSettled([
      playersAPI.getPlayerPredictions(player.id),
      playersAPI.getPlayer(player.id),
    ])
    if (predsRes.status === 'fulfilled') {
      setPlayerPredictions(predsRes.value.data)
    } else {
      setPlayerPredsError('Failed to load predictions for this player.')
    }
    if (detailRes.status === 'fulfilled') {
      setSelectedPlayerWinnerId(detailRes.value.data.tournament_winner_id ?? null)
    }
    setPlayerPredsLoading(false)
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
      <NotificationBanners banners={banners} onDismiss={dismissBanner} />
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
          {!openLoading && !openError && openGames.length > 0 && (
            <input
              className="team-filter-search"
              placeholder="Filter by team name…"
              value={teamSearch}
              onChange={e => setTeamSearch(e.target.value)}
            />
          )}
          {!openLoading && !openError && openGames.length === 0 && (
            <p className="empty-state">No upcoming games open for predictions.</p>
          )}
          <div className="games-list">
            {openGames.filter(matchesTeam).map((game) => {
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
                          onFocus={(e) => e.target.select()}
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
                          onFocus={(e) => e.target.select()}
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
            const pct = (x: number) => Math.round(x / n * 100) + '%'
            const scoreMap: Record<string, number> = {}
            all.forEach((p: any) => {
              const k = `${p.team_a_score}–${p.team_b_score}`
              scoreMap[k] = (scoreMap[k] || 0) + 1
            })
            const topScore = n > 0
              ? Object.entries(scoreMap).sort((a, b) => b[1] - a[1])[0]
              : null
            const avgA = (all.reduce((s: number, p: any) => s + p.team_a_score, 0) / n).toFixed(1)
            const avgB = (all.reduce((s: number, p: any) => s + p.team_b_score, 0) / n).toFixed(1)

            let exact = 0, correctResult = 0
            let avgPoints: string | null = null
            if (game.is_scored && game.team_a.score != null && game.team_b.score != null) {
              const ao = game.team_a.score > game.team_b.score ? 'h' : game.team_a.score < game.team_b.score ? 'a' : 'd'
              all.forEach((p: any) => {
                if (p.team_a_score === game.team_a.score && p.team_b_score === game.team_b.score) exact++
                else {
                  const po = p.team_a_score > p.team_b_score ? 'h' : p.team_a_score < p.team_b_score ? 'a' : 'd'
                  if (po === ao) correctResult++
                }
              })
              const scoredPreds = all.filter((p: any) => p.points != null)
              if (scoredPreds.length > 0) {
                avgPoints = (scoredPreds.reduce((s: number, p: any) => s + p.points, 0) / scoredPreds.length).toFixed(1)
              }
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
                        <div className="gp-stat">
                          <span className="gp-stat-value">{avgA}–{avgB}</span>
                          <span className="gp-stat-label">avg goals</span>
                        </div>
                        {topScore && (
                          <div className="gp-stat">
                            <span className="gp-stat-value">{topScore[0]}</span>
                            <span className="gp-stat-label">most popular ({topScore[1]}×)</span>
                          </div>
                        )}
                        <div className="gp-stat">
                          <span className="gp-stat-value">{pct(homeW)}</span>
                          <span className="gp-stat-label">{game.team_a.name} win</span>
                        </div>
                        <div className="gp-stat">
                          <span className="gp-stat-value">{pct(draws)}</span>
                          <span className="gp-stat-label">draw</span>
                        </div>
                        <div className="gp-stat">
                          <span className="gp-stat-value">{pct(awayW)}</span>
                          <span className="gp-stat-label">{game.team_b.name} win</span>
                        </div>
                        {game.is_scored && (
                          <>
                            <div className="gp-stat gp-stat-exact">
                              <span className="gp-stat-value">{pct(exact)}</span>
                              <span className="gp-stat-label">exact score</span>
                            </div>
                            <div className="gp-stat">
                              <span className="gp-stat-value">{pct(correctResult)}</span>
                              <span className="gp-stat-label">correct result</span>
                            </div>
                            {avgPoints !== null && (
                              <div className="gp-stat">
                                <span className="gp-stat-value">{avgPoints}</span>
                                <span className="gp-stat-label">avg points</span>
                              </div>
                            )}
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
              {!pastLoading && !pastError && pastGames.length > 0 && (
                <input
                  className="team-filter-search"
                  placeholder="Filter by team name…"
                  value={teamSearch}
                  onChange={e => setTeamSearch(e.target.value)}
                />
              )}
              {!pastLoading && !pastError && pastGames.length === 0 && (
                <p className="empty-state">No past games yet.</p>
              )}
              <div className="games-list">
                {pastGames.filter(matchesTeam).map((game) => {
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
            onChange={(e) => { setPlayerSearch(e.target.value); setSelectedPlayer(null); setSelectedPlayerWinnerId(undefined) }}
          />

          {!selectedPlayer && winnerStats.length > 0 && (() => {
            const maxCount = winnerStats[0].count
            const total = winnerStats.reduce((s, r) => s + r.count, 0)
            return (
              <div className="winner-stats-block">
                <div className="winner-stats-title">🏆 Winner Predictions</div>
                {winnerStats.map(row => (
                  <div key={row.team_id} className="winner-stats-row">
                    <span className="winner-stats-team">{row.team_name}</span>
                    <div className="winner-stats-bar-wrap">
                      <div
                        className="winner-stats-bar"
                        style={{ width: `${(row.count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="winner-stats-count">{row.count}</span>
                  </div>
                ))}
                <div className="winner-stats-total">{total} player{total !== 1 ? 's' : ''} have made a pick</div>
              </div>
            )
          })()}

          {!selectedPlayer && (
            <div className="other-player-list">
              {filteredPlayers.length === 0 && playerSearch && (
                <p className="empty-state">No players found.</p>
              )}
              {filteredPlayers.map((p) => {
                const winnerTeam = p.tournament_winner_id
                  ? teams.find(t => t.id === p.tournament_winner_id)?.name
                  : null
                return (
                  <button
                    key={p.id}
                    className="other-player-btn"
                    onClick={() => handleSelectPlayer(p)}
                  >
                    <span className="player-username">{p.username}</span>
                    <span className="player-fullname">{p.first_name} {p.surname}</span>
                    {winnerTeam && (
                      <span className="player-winner-pick">🏆 {winnerTeam}</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {selectedPlayer && (
            <div className="other-player-predictions">
              <div className="other-player-header">
                <button className="back-btn" onClick={() => { setSelectedPlayer(null); setSelectedPlayerWinnerId(undefined) }}>
                  ← Back
                </button>
                <span className="other-player-name">
                  {selectedPlayer.username} — {selectedPlayer.first_name} {selectedPlayer.surname}
                </span>
              </div>

              {selectedPlayerWinnerId !== undefined && (
                <div className="winner-pick-card">
                  <span>🏆</span>
                  {selectedPlayerWinnerId !== null
                    ? <span>Predicted winner: <strong>{teams.find(t => t.id === selectedPlayerWinnerId)?.name ?? `Team #${selectedPlayerWinnerId}`}</strong></span>
                    : <span className="winner-pick-none">No winner pick recorded</span>
                  }
                </div>
              )}

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
