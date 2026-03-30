export default function RulesPage() {
  return (
    <div className="rules-page">
      <h2>Rules</h2>

      <div className="rules-section">
        <h3>How to Play</h3>
        <p>Predict the score of each FIFA World Cup 2026 match before kick-off. The closer your prediction, the more points you earn. The player with the most points at the end of the tournament wins.</p>
      </div>

      <div className="rules-section">
        <h3>Scoring</h3>
        <p>Points are awarded based on football knowledge — knowing who wins and by how much matters more than guessing the exact scoreline.</p>
        <table className="rules-table">
          <thead>
            <tr>
              <th>What you get right</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Correct result (win / draw / loss)</td>
              <td>4</td>
            </tr>
            <tr>
              <td>Correct goal difference <em>(only when result is also correct)</em></td>
              <td>+2</td>
            </tr>
            <tr>
              <td>Exact score bonus <em>(only when result + goal difference are both correct)</em></td>
              <td>+1</td>
            </tr>
            <tr>
              <td>Wrong result</td>
              <td>0</td>
            </tr>
          </tbody>
        </table>
        <p className="rules-note">Maximum per game: <strong>7 points</strong> (14 pts in double-points games)</p>

        <h4>Examples</h4>
        <table className="rules-table">
          <thead>
            <tr>
              <th>Your prediction</th>
              <th>Actual</th>
              <th>Points</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>2–1</td>
              <td>2–1</td>
              <td><strong>7</strong></td>
              <td>Exact score</td>
            </tr>
            <tr>
              <td>1–0</td>
              <td>2–1</td>
              <td><strong>6</strong></td>
              <td>Correct result + same goal difference (diff=1)</td>
            </tr>
            <tr>
              <td>3–0</td>
              <td>1–0</td>
              <td><strong>4</strong></td>
              <td>Correct result only (goal diff: 3 vs 1)</td>
            </tr>
            <tr>
              <td>2–0</td>
              <td>2–1</td>
              <td><strong>4</strong></td>
              <td>Correct result only (goal diff: 2 vs 1)</td>
            </tr>
            <tr>
              <td>0–1</td>
              <td>2–0</td>
              <td><strong>0</strong></td>
              <td>Wrong result</td>
            </tr>
          </tbody>
        </table>
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
        <p>The entry fee is <strong>5 GBP</strong> per player, payable to one of the administrators before the first game. Your account must be marked as paid to submit predictions.</p>
      </div>

      <div className="rules-section">
        <h3>Rankings</h3>
        <p>The overall ranking shows total points across all rounds. Per-round rankings are also available. Players with the same score share the same rank.</p>
      </div>

      <div className="rules-section" style={{ opacity: 0.6 }}>
        <h3>Previous Scoring System <span style={{ fontSize: '0.85em', fontWeight: 'normal' }}>(updated March 2026)</span></h3>
        <p>
          Before March 2026, points were awarded as: 1 pt participation + 3 pts correct result
          + 1 pt correct Team A score + 1 pt correct Team B score + 1 pt exact score bonus
          (max 7 pts). The new system rewards football knowledge — who wins and by how much —
          rather than lucky score guessing. Under the old system, 43% of available points came
          from guessing exact scores; now only 14% does.
        </p>
      </div>
    </div>
  )
}
