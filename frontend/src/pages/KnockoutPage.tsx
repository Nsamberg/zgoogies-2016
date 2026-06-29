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

const ROUND_NAMES = ['Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final']

// Layout constants (px)
const CARD_H = 72
const CARD_W = 180
const COL_GAP = 80   // horizontal gap between columns — SVG lines pass through here
const BASE_SLOT = 96 // slot height for leaf-round games
const HEADER_H = 36  // height of round label row at top
const PAD = 20       // extra padding at bottom/right of canvas

function stageToRound(stage: string): number {
  const s = stage.toLowerCase().trim()
  if (/\b32\b/.test(s)) return 0
  if (/\b16\b/.test(s)) return 1
  if (/quarter/.test(s)) return 2
  if (/semi/.test(s)) return 3
  if (/^final$/.test(s)) return 4
  return -1 // third place, group stage, unknown → excluded
}

function parseWRef(name: string): number | null {
  const m = name.match(/^W(\d+)$/i)
  return m ? parseInt(m[1]) : null
}

// Find the two R(prevRound) games that feed into `game`.
// Resolves both W{n} refs and actual team names (by winner lookup).
// Returns [topFeeder, bottomFeeder] ordered by game_number (lower = top).
function findFeeders(
  game: KOGame,
  prevRound: number,
  byNumber: Map<number, KOGame>,
  allGames: KOGame[]
): [KOGame | null, KOGame | null] {
  const prevGames = allGames.filter(g => stageToRound(g.stage) === prevRound)

  const resolve = (teamName: string): KOGame | null => {
    const ref = parseWRef(teamName)
    if (ref !== null) return byNumber.get(ref) ?? null
    // Actual team name — find the prev-round game this team won
    return prevGames.find(g => {
      const aWon = g.team_a.name === teamName
        && g.team_a.score != null && g.team_b.score != null
        && g.team_a.score > g.team_b.score
      const bWon = g.team_b.name === teamName
        && g.team_a.score != null && g.team_b.score != null
        && g.team_b.score > g.team_a.score
      return aWon || bWon
    }) ?? null
  }

  let fA = resolve(game.team_a.name)
  let fB = resolve(game.team_b.name)

  // Keep consistent top/bottom ordering: lower game_number on top
  const nA = fA?.game_number ?? Infinity
  const nB = fB?.game_number ?? Infinity
  if (nA > nB) { const tmp = fA; fA = fB; fB = tmp }

  return [fA, fB]
}

// Recursively assign { round, pos } to a game and all its feeders.
// pos doubles each round deeper: Final=0 → SF=0,1 → QF=0..3 → R16=0..7 → R32=0..15
function assignPositions(
  game: KOGame,
  round: number,
  pos: number,
  minRound: number,
  byNumber: Map<number, KOGame>,
  allGames: KOGame[],
  result: Map<number, { round: number; pos: number }>
) {
  if (result.has(game.id)) return // guard against double-visit
  result.set(game.id, { round, pos })
  if (round <= minRound) return

  const [fA, fB] = findFeeders(game, round - 1, byNumber, allGames)
  if (fA) assignPositions(fA, round - 1, 2 * pos,     minRound, byNumber, allGames, result)
  if (fB) assignPositions(fB, round - 1, 2 * pos + 1, minRound, byNumber, allGames, result)
}

// Layout helpers — all normalised so the highest round occupies the rightmost column
// and positions double per round going left.
function slotH(r: number, minR: number) { return BASE_SLOT * Math.pow(2, r - minR) }
function colLeft(r: number, minR: number) { return (r - minR) * (CARD_W + COL_GAP) }
function cardTopY(r: number, pos: number, minR: number) {
  const sh = slotH(r, minR)
  return HEADER_H + pos * sh + (sh - CARD_H) / 2
}
function centerY(r: number, pos: number, minR: number) { return cardTopY(r, pos, minR) + CARD_H / 2 }

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
  const tabsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gamesAPI.getKnockout()
      .then(res => setGames(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // ── Build bracket ─────────────────────────────────────────────────────────

  const byNumber = new Map<number, KOGame>()
  for (const g of games) {
    if (g.game_number != null) byNumber.set(g.game_number, g)
  }

  // Group by round, find available rounds
  const roundMap = new Map<number, KOGame[]>()
  for (const g of games) {
    const r = stageToRound(g.stage)
    if (r < 0) continue
    if (!roundMap.has(r)) roundMap.set(r, [])
    roundMap.get(r)!.push(g)
  }

  const availableRounds = [...roundMap.keys()].sort()
  const minRound = availableRounds[0] ?? 0
  const maxRound = availableRounds.length > 0 ? availableRounds[availableRounds.length - 1] : -1

  // Top-down position assignment starting from highest-round games (sorted by game_number)
  const gamePos = new Map<number, { round: number; pos: number }>()
  if (maxRound >= 0) {
    const roots = [...(roundMap.get(maxRound) ?? [])].sort(
      (a, b) => (a.game_number ?? 0) - (b.game_number ?? 0)
    )
    roots.forEach((g, i) => assignPositions(g, maxRound, i, minRound, byNumber, games, gamePos))
  }

  // Any games not reached by tree traversal get placed at remaining positions
  // (shouldn't happen in a well-formed bracket but handles partial data)
  const unplaced = games.filter(g => stageToRound(g.stage) >= 0 && !gamePos.has(g.id))
    .sort((a, b) => (a.game_number ?? 0) - (b.game_number ?? 0))
  if (unplaced.length > 0) {
    const usedByRound = new Map<number, Set<number>>()
    gamePos.forEach(({ round, pos }) => {
      if (!usedByRound.has(round)) usedByRound.set(round, new Set())
      usedByRound.get(round)!.add(pos)
    })
    for (const g of unplaced) {
      const r = stageToRound(g.stage)
      if (!usedByRound.has(r)) usedByRound.set(r, new Set())
      let p = 0
      while (usedByRound.get(r)!.has(p)) p++
      usedByRound.get(r)!.add(p)
      gamePos.set(g.id, { round: r, pos: p })
    }
  }

  // Canvas dimensions
  let maxLeafPos = 0
  gamePos.forEach(({ round, pos }) => {
    if (round === minRound) maxLeafPos = Math.max(maxLeafPos, pos)
  })
  const totalH = HEADER_H + (maxLeafPos + 1) * BASE_SLOT + PAD
  const totalW = maxRound >= 0 ? colLeft(maxRound, minRound) + CARD_W + PAD : CARD_W + PAD

  // ── SVG connector lines ───────────────────────────────────────────────────
  type Line = { x1: number; y1: number; x2: number; y2: number; key: string }
  const lines: Line[] = []

  games.filter(g => gamePos.has(g.id)).forEach(g => {
    const gp = gamePos.get(g.id)!
    if (gp.round <= minRound) return

    const [fA, fB] = findFeeders(g, gp.round - 1, byNumber, games)
    const feeders = [fA, fB].filter((f): f is KOGame => f !== null)
    if (feeders.length === 0) return

    const midX = colLeft(gp.round - 1, minRound) + CARD_W + COL_GAP / 2
    const pY   = centerY(gp.round, gp.pos, minRound)
    const fYs: number[] = []

    feeders.forEach(f => {
      const fp = gamePos.get(f.id)
      if (!fp) return
      const fY = centerY(fp.round, fp.pos, minRound)
      fYs.push(fY)
      lines.push({ x1: colLeft(fp.round, minRound) + CARD_W, y1: fY, x2: midX, y2: fY, key: `h1-${f.id}` })
    })

    if (fYs.length === 2) {
      lines.push({ x1: midX, y1: Math.min(fYs[0], fYs[1]), x2: midX, y2: Math.max(fYs[0], fYs[1]), key: `v-${g.id}` })
    }
    lines.push({ x1: midX, y1: pY, x2: colLeft(gp.round, minRound), y2: pY, key: `h2-${g.id}` })
  })

  // ── Active round tracking ─────────────────────────────────────────────────
  useEffect(() => {
    if (availableRounds.length === 0) return
    const firstUnscored = availableRounds.find(r => roundMap.get(r)?.some(g => !g.is_scored))
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
        if (x >= colLeft(r, minRound) - PAD) best = r
      }
      setActiveRound(best)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableRounds.join(','), minRound])

  const scrollToRound = useCallback((r: number) => {
    scrollRef.current?.scrollTo({ left: colLeft(r, minRound), behavior: 'smooth' })
    setActiveRound(r)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minRound])

  // Scroll the active tab into view whenever activeRound changes (e.g. from bracket scroll)
  useEffect(() => {
    const tab = tabsRef.current?.querySelector<HTMLElement>(`[data-round="${activeRound}"]`)
    tab?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeRound])

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
      <div className="ko-tabs" ref={tabsRef}>
        {availableRounds.map(r => (
          <button
            key={r}
            data-round={r}
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

          {/* SVG connector lines */}
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
              style={{ left: colLeft(r, minRound), width: CARD_W }}
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
                style={{ left: colLeft(r, minRound), top: cardTopY(r, pos, minRound), width: CARD_W }}
              >
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
