import { useState, useEffect, useRef, useCallback } from 'react'
import { gamesAPI } from '../services/api'
import { useAuthStore } from '../stores/authStore'

interface KOGame {
  id: number
  game_number: number | null
  stage: string
  team_a: { id: number; name: string; score: number | null }
  team_b: { id: number; name: string; score: number | null }
  game_date: string
  location: string
  is_scored: boolean
  is_double_points: boolean
  prediction: { team_a_score: number; team_b_score: number; points: number | null } | null
}

// Round names by index (0 = earliest / most games)
const ROUND_NAMES = ['Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final']

// Layout constants (px)
const CARD_H = 88
const CARD_W = 180
const COL_GAP = 80   // horizontal gap between columns — SVG lines pass through here
const BASE_SLOT = 96 // slot height for the leaf round
const HEADER_H = 36  // height of the round label row
const PAD = 20       // bottom/right padding inside the canvas

function stageToRound(stage: string): number {
  const s = stage.toLowerCase().trim()
  if (/\b32\b/.test(s)) return 0
  if (/\b16\b/.test(s)) return 1
  if (/quarter/.test(s)) return 2
  if (/semi/.test(s)) return 3
  if (/^final$/.test(s)) return 4
  return -1 // third place, group stage, unknown — excluded
}

function parseWRef(name: string): number | null {
  const m = name.match(/^W(\d+)$/i)
  return m ? parseInt(m[1]) : null
}

// Recursively find the minimum game_number among the R32 leaf games for bracket ordering
function minLeafNumber(game: KOGame, round: number, minRound: number, byNumber: Map<number, KOGame>): number {
  if (round <= minRound) return game.game_number ?? 99999
  const refs = ([parseWRef(game.team_a.name), parseWRef(game.team_b.name)]
    .filter((x): x is number => x !== null))
  if (refs.length > 0) {
    const feeders = refs.map(n => byNumber.get(n)).filter((g): g is KOGame => g != null)
    if (feeders.length > 0) {
      return Math.min(...feeders.map(f => minLeafNumber(f, round - 1, minRound, byNumber)))
    }
  }
  return game.game_number ?? 99999
}

function formatDate(isoDate: string, timezone: string): string {
  return new Date(isoDate).toLocaleString('en-GB', {
    timeZone: timezone, weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

function pointsLabel(pts: number | null | undefined): string {
  if (pts == null) return '—'
  return `${pts} pt${pts !== 1 ? 's' : ''}`
}

export default function KnockoutPage() {
  const { user } = useAuthStore()
  const timezone = user?.timezone || 'UTC'

  const [games, setGames] = useState<KOGame[]>([])
  const [loading, setLoading] = useState(true)
  const [activeRound, setActiveRound] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gamesAPI.getKnockout()
      .then(res => setGames(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // ── Build bracket layout ──────────────────────────────────────────────────

  // game_number → game lookup
  const byNumber = new Map<number, KOGame>()
  for (const g of games) {
    if (g.game_number != null) byNumber.set(g.game_number, g)
  }

  // Group by round index
  const roundMap = new Map<number, KOGame[]>()
  for (const g of games) {
    const r = stageToRound(g.stage)
    if (r < 0) continue
    if (!roundMap.has(r)) roundMap.set(r, [])
    roundMap.get(r)!.push(g)
  }

  const availableRounds = [...roundMap.keys()].sort()
  const minRound = availableRounds.length > 0 ? availableRounds[0] : 0
  const maxRound = availableRounds.length > 0 ? availableRounds[availableRounds.length - 1] : -1

  // Sort games within each round by their bracket order
  const sortedRounds = new Map<number, KOGame[]>()
  roundMap.forEach((gs, r) => {
    sortedRounds.set(r, [...gs].sort(
      (a, b) => minLeafNumber(a, r, minRound, byNumber) - minLeafNumber(b, r, minRound, byNumber)
    ))
  })

  // game.id → { round, pos }
  const gamePos = new Map<number, { round: number; pos: number }>()
  sortedRounds.forEach((gs, r) => gs.forEach((g, pos) => gamePos.set(g.id, { round: r, pos })))

  // Layout helpers (all normalized to minRound)
  const slotH    = (r: number) => BASE_SLOT * Math.pow(2, r - minRound)
  const colLeft   = (r: number) => (r - minRound) * (CARD_W + COL_GAP)
  const cardTopY  = (r: number, pos: number) => { const sh = slotH(r); return HEADER_H + pos * sh + (sh - CARD_H) / 2 }
  const centerY   = (r: number, pos: number) => cardTopY(r, pos) + CARD_H / 2

  const numLeafGames = sortedRounds.get(minRound)?.length ?? 1
  const totalH = HEADER_H + numLeafGames * BASE_SLOT + PAD
  const totalW = maxRound >= 0 ? colLeft(maxRound) + CARD_W + PAD : CARD_W + PAD

  // ── SVG connector lines ───────────────────────────────────────────────────
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number; key: string }> = []
  sortedRounds.forEach((gs, r) => {
    if (r <= minRound) return
    gs.forEach((g, pos) => {
      const refs = ([parseWRef(g.team_a.name), parseWRef(g.team_b.name)]
        .filter((x): x is number => x !== null))
      const feeders = refs.map(n => byNumber.get(n)).filter((f): f is KOGame => f != null)
      if (feeders.length !== 2) return

      const midX = colLeft(r - 1) + CARD_W + COL_GAP / 2
      const pY   = centerY(r, pos)

      // Horizontal lines from each feeder's right edge to midX
      feeders.forEach(f => {
        const fp = gamePos.get(f.id)
        if (!fp) return
        const fY = centerY(fp.round, fp.pos)
        lines.push({ x1: colLeft(r - 1) + CARD_W, y1: fY, x2: midX, y2: fY, key: `h1-${f.id}` })
      })

      // Vertical line between the two feeders at midX, then horizontal to parent
      const fYs = feeders.map(f => { const fp = gamePos.get(f.id); return fp ? centerY(fp.round, fp.pos) : null }).filter((y): y is number => y !== null)
      if (fYs.length === 2) {
        lines.push({ x1: midX, y1: Math.min(fYs[0], fYs[1]), x2: midX, y2: Math.max(fYs[0], fYs[1]), key: `v-${g.id}` })
        lines.push({ x1: midX, y1: pY, x2: colLeft(r), y2: pY, key: `h2-${g.id}` })
      }
    })
  })

  // ── Default active round and scroll tracking ──────────────────────────────
  useEffect(() => {
    if (availableRounds.length === 0) return
    const firstUnscored = availableRounds.find(r => sortedRounds.get(r)?.some(g => !g.is_scored))
    setActiveRound(firstUnscored ?? availableRounds[availableRounds.length - 1])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games.length])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || availableRounds.length === 0) return
    const onScroll = () => {
      const x = el.scrollLeft
      let best = availableRounds[0]
      for (const r of availableRounds) {
        if (x >= colLeft(r) - PAD) best = r
      }
      setActiveRound(best)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableRounds.join(',')])

  const scrollToRound = useCallback((r: number) => {
    scrollRef.current?.scrollTo({ left: colLeft(r), behavior: 'smooth' })
    setActiveRound(r)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minRound])

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="knockout-page">
        <h2 className="page-title">Knockout Bracket</h2>
        <p className="loading-text">Loading…</p>
      </div>
    )
  }

  if (maxRound < 0) {
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

      {/* Round navigation tabs */}
      <div className="ko-tabs">
        {availableRounds.map(r => (
          <button
            key={r}
            className={`ko-tab${activeRound === r ? ' ko-tab--active' : ''}`}
            onClick={() => scrollToRound(r)}
          >
            {ROUND_NAMES[r] ?? `Round ${r}`}
          </button>
        ))}
      </div>

      {/* Scrollable bracket canvas */}
      <div className="ko-bracket-wrap" ref={scrollRef}>
        <div className="ko-bracket-inner" style={{ width: totalW, height: totalH }}>

          {/* SVG connector lines rendered beneath the cards */}
          <svg className="ko-bracket-svg" width={totalW} height={totalH} aria-hidden="true">
            {lines.map(l => (
              <line key={l.key} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                stroke="#c8c8d8" strokeWidth={2} strokeLinecap="round" />
            ))}
          </svg>

          {/* Round header labels */}
          {availableRounds.map(r => (
            <div
              key={`hdr-${r}`}
              className="ko-round-header"
              style={{ left: colLeft(r), width: CARD_W }}
            >
              {ROUND_NAMES[r] ?? `Round ${r}`}
            </div>
          ))}

          {/* Game cards */}
          {games.filter(g => gamePos.has(g.id)).map(g => {
            const { round: r, pos } = gamePos.get(g.id)!
            const aWon = g.is_scored && g.team_a.score != null && g.team_b.score != null && g.team_a.score > g.team_b.score
            const bWon = g.is_scored && g.team_a.score != null && g.team_b.score != null && g.team_b.score > g.team_a.score

            return (
              <div
                key={g.id}
                className={`ko-card${g.is_double_points ? ' ko-card--double' : ''}`}
                style={{ left: colLeft(r), top: cardTopY(r, pos), width: CARD_W }}
              >
                <div className="ko-card-location">{g.location}</div>
                <div className="ko-card-teams">
                  <div className={`ko-card-team${g.is_scored && !aWon ? ' ko-team-lost' : ''}`}>
                    <span className="ko-team-name">{g.team_a.name}</span>
                    {g.is_scored && g.team_a.score != null && (
                      <span className="ko-team-score">{g.team_a.score}</span>
                    )}
                  </div>
                  <div className={`ko-card-team${g.is_scored && !bWon ? ' ko-team-lost' : ''}`}>
                    <span className="ko-team-name">{g.team_b.name}</span>
                    {g.is_scored && g.team_b.score != null && (
                      <span className="ko-team-score">{g.team_b.score}</span>
                    )}
                  </div>
                </div>
                {!g.is_scored && (
                  <div className="ko-card-date">{formatDate(g.game_date, timezone)}</div>
                )}
                {g.prediction ? (
                  <div className="ko-card-pred">
                    {g.prediction.team_a_score}–{g.prediction.team_b_score}
                    {g.is_scored && (
                      <span className="ko-card-pts"> · {pointsLabel(g.prediction.points)}</span>
                    )}
                  </div>
                ) : g.is_scored ? (
                  <div className="ko-card-pred ko-card-pred--none">No prediction</div>
                ) : null}
              </div>
            )
          })}

        </div>
      </div>

      <p className="ko-scroll-hint">← Scroll to see other rounds →</p>
    </div>
  )
}
