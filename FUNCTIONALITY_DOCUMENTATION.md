# ZGoogies — Functionality Documentation

## Overview

ZGoogies is a football tournament prediction game for the FIFA World Cup 2026. Players compete by predicting match scores. The platform tracks predictions, calculates points, and maintains rankings throughout the tournament.

**Key terminology:**
- **Tournament Stages**: The official football phases (Group Stage, Round of 16, Quarter Finals, Semi Finals, Final)
- **Competition Rounds**: Admin-defined scoring periods (Round 1, Round 2, Round 3) — independent from tournament stages. Each game belongs to exactly one round. The last round awards double points.

---

## Registration Fee

- 5 GBP (6.5 EUR / 7.5 USD / 9.5 AUD), paid before the first game
- 90% redistributed as prizes; 10% donated to Alexander Divine charity
- Payment made to a cashier (Bruno Spada in Nice; Patrick Hebant or Nikolaus Samberger in London)

---

## 1. User Registration & Account Management

### Registration
- Users create an account with: username, first name, surname, email, timezone, tournament winner prediction
- System generates a random 10-character alphanumeric password
- Confirmation email sent with credentials and payment instructions
- Registration closes 2 hours before the first game starts
- Username must be unique

### Login & Authentication
- Username + password login with reCAPTCHA v2
- Session-based authentication; session persists until explicit logout
- Access logs recorded on login/logout

### Password Management
- Forgot password: enter username or email → system generates new password → sent by email
- Change password: available in My Account after login (requires current password)

### Account Settings (My Account page)
- **Profile tab**: edit first name, surname, email, timezone, tournament winner prediction
  - Tournament winner prediction locked once the tournament begins
- **Change Password tab**: enter current password + new password

### User Roles
- **Player**: standard user — can predict, view rankings and players
- **Cashier**: also a player — can record payments and publish news
- **Admin**: also a cashier — full access including score entry, user deletion, DB access
- Only admins can change a user's role
- Payment recording requires cashier or admin role

### Payment Status
- Users cannot make predictions until payment is recorded
- Recorded by a cashier or admin
- Email confirmation sent when payment is received

---

## 2. Game Prediction System

### Open Games (upcoming predictions)
- Lists all games not yet closed for predictions
- Prediction window closes 2 hours before game start
- Each game shows: date/time (in user's timezone), location, teams, competition round, stage, group
- Shows the user's existing prediction if one was made
- Allows editing predictions before the deadline

### Making Predictions
- Enter predicted score for Team A and Team B
- Submission creates a new prediction or updates the existing one (no page reload)
- Every prediction saved to history with timestamp and type (New / Edit)
- Validation: both scores must be numbers; game must be open; user must have paid

### Past Games (closed predictions)
- Lists all games where the prediction window has closed, newest first
- Shows: game details, user's prediction, actual result (if played), points earned

### Other Players tab
- Search by username to view any player's predictions on closed games
- Shows game details, their prediction, result, and points earned

### Prediction History
- Full audit trail: every prediction action logged with timestamp
- Tracks new predictions vs edits
- History preserved even after edits

---

## 3. Points & Scoring System

### Points Per Game

| Scenario | Points |
|----------|--------|
| Exact score match | 7 pts (1 + 3 + 2 + 1 bonus) |
| Correct winner + correct score for one team | 5 pts |
| Correct winner or draw, wrong scores | 4 pts |
| Correct score for one team only | 2 pts |
| Prediction submitted but incorrect | 1 pt |
| No prediction | 0 pts |

Breakdown:
- 1 pt — participation (any prediction submitted)
- 3 pts — correct result (win/draw/loss)
- 1 pt — correct Team A score
- 1 pt — correct Team B score
- 1 pt — exact score bonus

### Double Points (Last Round)
- All games in the last competition round award 2× points
- Applies to all scoring components
- Example: 7-point exact match becomes 14 points in the last round

### Tournament Winner Bonus
- 15 points added to overall ranking for correctly predicting the tournament winner
- Locked at competition start; awarded at tournament end

### Score Entry & Auto-Calculation
- Admin enters actual result → system auto-calculates points for all players
- Updates both the specific round ranking and the overall ranking simultaneously
- Ranking history snapshot saved after each game
- Score rollback available to correct input errors

---

## 4. Ranking System

### Overall Ranking
- All players ranked by cumulative points across all competition rounds
- Updated after each game is scored
- Tied positions handled correctly (two players at 2nd → next is 4th)
- Shows: rank, username, total points

### Per-Round Rankings
- Separate leaderboard for each competition round
- Based only on points earned within that round
- Winners determined at end of each round

### Display Features
- Medal badges for top 3 (gold/silver/bronze)
- Current user's row highlighted
- Rank tabs are dynamic — built from rounds in the database with at least one game

### Ranking History
- Snapshot saved after every scored game
- Charts showing rank progression over time (per round or overall)

### Prize Distribution
- 40% of prize pool → top 5 of overall ranking
- 20% of prize pool → top 5 of each competition round ranking
- Per position: 45% / 25% / 15% / 10% / 5%
- Tied players share the combined prize money for their positions

---

## 5. Players Page

- Full list of registered players, sorted alphabetically by username
- Search by username (live filter)
- Filter by role: Players / Cashiers / Admins (multi-select)
- Shows: username, full name, role badge
- Expandable rows: view a player's predictions on closed games

---

## 6. Game Statistics & Analytics (planned)

- Prediction distribution per game (score groups, win/draw/loss percentages)
- Filter by predicted score to find like-minded predictors
- All players' predictions visible after game closes for predictions

---

## 7. Admin Functions

### Payment Management (Cashier + Admin)
- Mark users as paid / unpaid
- Record which cashier received the payment
- Sends email confirmation to user on payment
- Activates prediction ability immediately

### Score Entry (Admin only)
- List of unscored games, sorted by date
- Enter Team A and Team B scores
- System auto-calculates and updates all rankings
- Rollback available to correct an error

### Tournament Winner Selection (Admin only)
- Select the tournament winning team after the final
- System awards 15-point bonus to correct predictors
- Updates and recalculates final overall ranking
- Rollback available in case of input error

### News Publication (Cashier + Admin)
- Create articles with text and optional image
- Edit and delete existing articles

### User Deletion (Admin only)
- Delete any user account (cannot delete own account)
- Confirmation prompt with user details before deletion
- Permanently removes: account, predictions, history, rankings, payment records, access logs
- Action logged for audit trail

### Admin Dashboard
- Links to: payment management (cashier+admin), score entry (admin), winner selection (admin), news publication (cashier+admin), user management (admin), DB browser (admin)

---

## 8. News Page

- Articles published by admin or cashier
- Announcements, competition updates, general information

---

## 9. Technical Features

### Timezone Support
- All times stored and processed in UTC
- Game closure (2h before start) computed in UTC
- Displayed in user's selected timezone

### Device Compatibility
- Responsive design — desktop and mobile
- Compatible with Edge, Chrome, Safari, Firefox

### Session Management
- Cookie-based sessions
- Session persists until explicit logout
- No expiry on navigation or page reload

### Email Notifications
- Registration confirmation (credentials + payment instructions)
- Payment confirmation
- Password reset
- All sent automatically in background (non-blocking)

### Access Tracking
- Every login, logout, and page access logged with timestamp

---

## 10. Competition Rounds System

### Definition
- Admin creates numbered rounds (Round 1, Round 2, ..., Round N) before the competition starts
- Each game is assigned to exactly one round — independent of football stage
- Example: 104 games across 3 rounds (36 / 36 / 32)

### Scoring
- When a game score is entered, points update for:
  - The competition round containing that game
  - The overall cumulative ranking
- Last round always applies 2× multiplier

### Database Structure
- `competition_rounds` table: id, round_number, name, is_current
- `games.competition_round_id`: foreign key to competition_rounds
- `rankings`: separate records per round + overall
- `ranking_history`: snapshots for both round and overall rankings

---

## 11. Security & Permissions

| Access Level | Can Do |
|-------------|--------|
| Public | View login/register/forgot password pages |
| Authenticated | View predictions, rankings, players, news, account |
| Paid player | Make and edit predictions |
| Cashier | + Record payments, publish news |
| Admin | + Enter scores, select winner, delete users, DB access |

---

## 12. Key Business Rules

- Predictions close exactly 2 hours before game start (UTC)
- Cannot predict on a closed game — cannot be overridden by admin
- Registration closes 2 hours before the first game starts
- Must have paid to make predictions
- Tournament winner prediction locked at competition start
- Last competition round always worth 2× points
- Tied ranks share prizes proportionally
- Admin cannot delete their own account
