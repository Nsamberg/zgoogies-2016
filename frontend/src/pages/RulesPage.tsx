import { useState, useEffect } from 'react'
import { playersAPI } from '../services/api'

interface StaffMember {
  first_name: string
  surname: string
  email: string
  is_cachier: boolean
  is_admin: boolean
}

export default function RulesPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])

  useEffect(() => {
    playersAPI.getStaff()
      .then(res => setStaff(res.data))
      .catch(() => {})
  }, [])

  const cashiers = staff.filter(s => s.is_cachier)
  const admins = staff.filter(s => s.is_admin && !s.is_cachier)

  return (
    <div className="rules-page">
      <h2>Rules</h2>

      <div className="rules-section">
        <h3>How to Play</h3>
        <p>Predict the score of each FIFA World Cup 2026 match before kick-off. The closer your prediction, the more points you earn. The player with the most points at the end of the tournament wins.</p>
      </div>

      <div className="rules-section">
        <h3>Scoring</h3>
        <p>For each match you predict, points are awarded as follows:</p>
        <table className="rules-table">
          <thead>
            <tr>
              <th>What you get right</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Submitting a prediction (participation)</td>
              <td>1</td>
            </tr>
            <tr>
              <td>Correct match result (win / draw / loss)</td>
              <td>3</td>
            </tr>
            <tr>
              <td>Correct score for Team A</td>
              <td>1</td>
            </tr>
            <tr>
              <td>Correct score for Team B</td>
              <td>1</td>
            </tr>
            <tr>
              <td>Exact final score (both teams correct)</td>
              <td>1 bonus</td>
            </tr>
          </tbody>
        </table>
        <p className="rules-note">Maximum per game: <strong>7 points</strong> (exact score = 1 + 3 + 1 + 1 + 1)</p>
      </div>

      <div className="rules-section">
        <h3>Double Points Round</h3>
        <p>All points are <strong>doubled</strong> in the final round (Round of 16 onwards — 32 games). Make your predictions count!</p>
      </div>

      <div className="rules-section">
        <h3>Tournament Winner Bonus</h3>
        <p>At registration, you pick which team you think will win the World Cup. If your team wins, you earn a <strong>+15 point bonus</strong> added to your final score. You can change your pick any time before the tournament starts.</p>
      </div>

      <div className="rules-section">
        <h3>Prediction Deadline</h3>
        <p>Predictions must be submitted at least <strong>2 hours before kick-off</strong>. Once the deadline passes, the game is locked and no prediction can be entered or changed.</p>
      </div>

      <div className="rules-section">
        <h3>Tournament Structure</h3>
        <table className="rules-table">
          <thead>
            <tr>
              <th>Round</th>
              <th>Games</th>
              <th>Points multiplier</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Round 1 — Group Stage</td>
              <td>36</td>
              <td>×1</td>
            </tr>
            <tr>
              <td>Round 2 — Group Stage</td>
              <td>36</td>
              <td>×1</td>
            </tr>
            <tr>
              <td>Round 3 — Knockout</td>
              <td>32</td>
              <td>×2</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rules-section">
        <h3>Registration Fee</h3>
        <p>The entry fee is <strong>5 GBP</strong> per player, payable to one of the cashiers below before the first game. Your account must be marked as paid to submit predictions.</p>
      </div>

      {staff.length > 0 && (
        <div className="rules-section">
          <h3>Who to Pay</h3>
          {cashiers.length > 0 && (
            <>
              <p className="rules-staff-label">Cashiers</p>
              <ul className="rules-staff-list">
                {cashiers.map(s => (
                  <li key={s.email}>
                    <a href={`mailto:${s.email}`} className="rules-staff-link">
                      {s.first_name} {s.surname}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
          {admins.length > 0 && (
            <>
              <p className="rules-staff-label">Admins</p>
              <ul className="rules-staff-list">
                {admins.map(s => (
                  <li key={s.email}>
                    <a href={`mailto:${s.email}`} className="rules-staff-link">
                      {s.first_name} {s.surname}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="rules-section">
        <h3>Rankings</h3>
        <p>The overall ranking shows total points across all rounds. Per-round rankings are also available. Players with the same score share the same rank.</p>
      </div>
    </div>
  )
}
