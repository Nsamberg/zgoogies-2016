import { useState, useEffect, useRef, useCallback } from 'react'
import { gamesAPI } from '../services/api'
import { useAuthStore } from '../stores/authStore'

interface KOGame {
  id: number
  stage: string
  team_a: { id: number; name: string; score: number | null }
  team_b: { id: number; name: string; score: number | null }
  game_date: string
  location: string
  is_scored: boolean
  is_double_points: boolean
  prediction: { team_a_score: number; team_b_score: number; points: number | null } | null
}

// Canonical ordering for knockout stages
const STAGE_RANK: Record<string, number> = {}
;[
  'round of 32', 'round of 16',
  'quarter-final', 'quarter final', 'quarterfinal', 'quarter finals',
  'semi-final', 'semi final', 'semifinal', 'semi finals',
  'third place', 'third-place', '3rd place',
  'final',
].forEach((s, i) => { STAGE_RANK[s] = i })

function rankStage(stage: string): number {
  return STAGE_RANK[stage.toLowerCase()] ?? 99
}

function isThirdPlace(stage: string): boolean {
  const s = stage.toLowerCase()
  return s.includes('third') || s.includes('3rd')
}

function formatDate(isoDate: string, timezone: string): string {
  return new Date(isoDate).toLocaleString('en-GB', {
    timeZone: timezone,
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

function pointsLabel(pts: number | null | undefined): string {
  if (pts == null) return '—'
  return `${pts} pt${pts !== 1 ? 's' : ''}`
}

function KOCard({ game, timezone }: { game: KOGame; timezone: string }) {
  const aWon = game.is_scored && game.team_a.score != null && game.team_b.score != null
    && game.team_a.score > game.team_b.score
  const bWon = game.is_scored && game.team_a.score != null && game.team_b.score != null
    && game.team_b.score > game.team_a.score

  return (
    <div className={`ko-card${game.is_double_points ? ' ko-card--double' : ''}`}>
      <div className="ko-card-location">{game.location}</div>
      <div className="ko-card-teams">
        <div className={`ko-card-team${game.is_scored && !aWon ? ' ko-team-lost' : ''}`}>
          <span className="ko-team-name">{game.team_a.name}</span>
          {game.is_scored && game.team_a.score != null && (
            <span className="ko-team-score">{game.team_a.score}</span>
          )}
        </div>
        <div className={`ko-card-team${game.is_scored && !bWon ? ' ko-team-lost' : ''}`}>
          <span className="ko-team-name">{game.team_b.name}</span>
          {game.is_scored && game.team_b.score != null && (
            <span className="ko-team-score">{game.team_b.score}</span>
          )}
        </div>
      </div>
      {!game.is_scored && (
        <div className="ko-card-date">{formatDate(game.game_date, timezone)}</div>
      )}
      {game.prediction ? (
        <div className="ko-card-pred">
          {game.prediction.team_a_score} – {game.prediction.team_b_score}
          {game.is_scored && (
            <span className="ko-card-pts"> · {pointsLabel(game.prediction.points)}</span>
          )}
        </div>
      ) : game.is_scored ? (
        <div className="ko-card-pred ko-card-pred--none">No prediction</div>
      ) : null}
    </div>
  )
}

export default function KnockoutPage() {
  const { user } = useAuthStore()
  const timezone = user?.timezone || 'UTC'

  const [games, setGames] = useState<KOGame[]>([])
  const [loading, setLoading] = useState(true)
  const [activeStage, setActiveStage] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const tabsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gamesAPI.getKnockout()
      .then(res => {
        const data: KOGame[] = res.data
        setGames(data)
        if (data.length > 0) {
          const stages = [...new Set(data.map(g => g.stage))].sort((a, b) => rankStage(a) - rankStage(b))
          // Default: earliest stage with unscored games, else last stage
          const active = stages.find(s => data.some(g => g.stage === s && !g.is_scored)) ?? stages[stages.length - 1]
          setActiveStage(active)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const stages = [...new Set(games.map(g => g.stage))].sort((a, b) => rankStage(a) - rankStage(b))

  const gamesForStage = useCallback((stage: string) =>
    games.filter(g => g.stage === stage), [games])

  // For a given stage, find the "next bracket stage" (skip third-place)
  const nextMainStage = useCallback((stage: string): string | null => {
    const idx = stages.indexOf(stage)
    for (let i = idx + 1; i < stages.length; i++) {
      if (!isThirdPlace(stages[i])) return stages[i]
    }
    return null
  }, [stages])

  const scrollToStage = useCallback((stage: string) => {
    const col = scrollRef.current?.querySelector<HTMLElement>(`[data-stage="${CSS.escape(stage)}"]`)
    col?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
    setActiveStage(stage)

    // Scroll the tab into view
    const tab = tabsRef.current?.querySelector<HTMLElement>(`[data-tab="${CSS.escape(stage)}"]`)
    tab?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [])

  // Track which stage column is most visible to update the active tab
  useEffect(() => {
    const scroll = scrollRef.current
    if (!scroll) return
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          const stage = (entry.target as HTMLElement).dataset.stage ?? ''
          if (stage) setActiveStage(stage)
        }
      }
    }, { root: scroll, threshold: 0.5 })

    scroll.querySelectorAll<HTMLElement>('[data-stage]').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [games])

  if (loading) {
    return (
      <div className="knockout-page">
        <h2 className="page-title">Knockout Bracket</h2>
        <p className="loading-text">Loading…</p>
      </div>
    )
  }

  if (stages.length === 0) {
    return (
      <div className="knockout-page">
        <h2 className="page-title">Knockout Bracket</h2>
        <p className="empty-state">No knockout games available yet.</p>
      </div>
    )
  }

  return (
    <div className="knockout-page">
      <h2 className="page-title">Knockout Bracket</h2>

      {/* Stage navigation tabs — horizontally scrollable */}
      <div className="ko-tabs" ref={tabsRef}>
        {stages.map(stage => (
          <button
            key={stage}
            data-tab={stage}
            className={`ko-tab${activeStage === stage ? ' ko-tab--active' : ''}`}
            onClick={() => scrollToStage(stage)}
          >
            {stage}
          </button>
        ))}
      </div>

      {/* Horizontally scrollable bracket */}
      <div className="ko-bracket-scroll" ref={scrollRef}>
        {stages.map(stage => {
          const stageGames = gamesForStage(stage)
          const next = nextMainStage(stage)
          const nextGames = next ? gamesForStage(next) : []

          // Pair games within this stage by game date order (already sorted)
          const pairs: KOGame[][] = []
          for (let i = 0; i < stageGames.length; i += 2) {
            pairs.push(stageGames.slice(i, i + 2))
          }

          return (
            <div key={stage} className="ko-stage-col" data-stage={stage}>
              <div className="ko-stage-header">{stage}</div>

              <div className="ko-pairs-list">
                {pairs.map((pair, pairIdx) => {
                  const nextGame = nextGames[pairIdx]
                  const hasPair = pair.length === 2

                  return (
                    <div key={pairIdx} className="ko-pair-row">
                      {/* Left: the one or two game cards */}
                      <div className="ko-pair-games">
                        {pair.map(g => (
                          <KOCard key={g.id} game={g} timezone={timezone} />
                        ))}
                      </div>

                      {/* Bracket arm + next-round preview (only for pairs of 2) */}
                      {hasPair && (
                        <>
                          <div className="ko-arm" aria-hidden="true">
                            <div className="ko-arm-top" />
                            <div className="ko-arm-bot" />
                          </div>
                          <div className="ko-next-preview">
                            {nextGame ? (
                              <div
                                className="ko-next-card"
                                onClick={() => scrollToStage(next!)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={e => e.key === 'Enter' && scrollToStage(next!)}
                              >
                                <div className="ko-next-location">{nextGame.location}</div>
                                <div className="ko-next-teams">
                                  <div className={`ko-next-team${nextGame.is_scored && nextGame.team_b.score != null && nextGame.team_a.score != null && nextGame.team_a.score < nextGame.team_b.score ? ' ko-team-lost' : ''}`}>
                                    {nextGame.team_a.name}
                                  </div>
                                  <div className={`ko-next-team${nextGame.is_scored && nextGame.team_a.score != null && nextGame.team_b.score != null && nextGame.team_b.score < nextGame.team_a.score ? ' ko-team-lost' : ''}`}>
                                    {nextGame.team_b.name}
                                  </div>
                                </div>
                                {nextGame.is_scored && nextGame.team_a.score != null && (
                                  <div className="ko-next-score">
                                    {nextGame.team_a.score} – {nextGame.team_b.score}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="ko-next-card ko-next-card--tbd">
                                <div className="ko-next-team">TBD</div>
                                <div className="ko-next-team">TBD</div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <p className="ko-scroll-hint">← Scroll to see other rounds →</p>
    </div>
  )
}
