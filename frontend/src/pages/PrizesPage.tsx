import { useState, useEffect } from 'react'
import { rankingsAPI, playersAPI } from '../services/api'

const ROUND_PRIZES = [30, 17, 11, 7, 5]
const OVERALL_PRIZES = [70, 45, 30, 15, 10]
const ROUND_PRIZE_TOTAL = ROUND_PRIZES.reduce((s, v) => s + v, 0)
const OVERALL_PRIZE_TOTAL = OVERALL_PRIZES.reduce((s, v) => s + v, 0)

const MEDALS = ['🥇', '🥈', '🥉']
const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th']

export default function PrizesPage() {
  const [paidCount, setPaidCount] = useState<number | null>(null)
  const [roundCount, setRoundCount] = useState<number | null>(null)

  useEffect(() => {
    Promise.allSettled([
      playersAPI.getAll(),
      rankingsAPI.getRounds(),
    ]).then(([playersRes, roundsRes]) => {
      if (playersRes.status === 'fulfilled') {
        const paid = playersRes.value.data.filter((p: any) => p.has_paid).length
        setPaidCount(paid)
      }
      if (roundsRes.status === 'fulfilled') {
        setRoundCount(roundsRes.value.data.length)
      }
    })
  }, [])

  const totalPot = roundCount != null
    ? roundCount * ROUND_PRIZE_TOTAL + OVERALL_PRIZE_TOTAL
    : null

  return (
    <div className="prizes-page">
      <h1 className="page-title">Prizes</h1>

      {/* Summary banner */}
      <div className="prizes-summary">
        <div className="prizes-summary-stat">
          <span className="prizes-summary-value">
            {paidCount != null ? paidCount : '—'}
          </span>
          <span className="prizes-summary-label">players entered</span>
        </div>
        <div className="prizes-summary-divider" />
        <div className="prizes-summary-stat">
          <span className="prizes-summary-value">
            {totalPot != null ? `£${totalPot}` : '—'}
          </span>
          <span className="prizes-summary-label">total prize pot</span>
        </div>
      </div>

      {/* Overall prizes */}
      <section className="prizes-section">
        <h2 className="prizes-section-title">
          Overall
          <span className="prizes-section-sub"> · £{OVERALL_PRIZE_TOTAL} total</span>
        </h2>
        <div className="prizes-overall-grid">
          {OVERALL_PRIZES.map((amount, i) => (
            <div key={i} className={`prizes-overall-card prizes-overall-card--${i + 1}`}>
              <span className="prizes-overall-medal">
                {MEDALS[i] ?? <span className="prizes-overall-num">{i + 1}</span>}
              </span>
              <span className="prizes-overall-ordinal">{ORDINALS[i]}</span>
              <span className="prizes-overall-amount">£{amount}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Per-round prizes */}
      <section className="prizes-section">
        <h2 className="prizes-section-title">
          Per Round
          {roundCount != null && (
            <span className="prizes-section-sub"> · {roundCount} round{roundCount !== 1 ? 's' : ''} · £{ROUND_PRIZE_TOTAL} each</span>
          )}
        </h2>
        <div className="prizes-round-list">
          {ROUND_PRIZES.map((amount, i) => (
            <div key={i} className={`prizes-round-row prizes-round-row--${i + 1}`}>
              <span className="prizes-pos">
                {MEDALS[i] ?? <span className="prizes-pos-num">{i + 1}</span>}
              </span>
              <span className="prizes-ordinal">{ORDINALS[i]}</span>
              <span className="prizes-amount">£{amount}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
