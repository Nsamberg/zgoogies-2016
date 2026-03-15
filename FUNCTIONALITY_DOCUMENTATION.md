# ZGoogies Sports Prediction Website - Complete Functionality Documentation

## Overview
ZGoogies is a football tournament prediction game website designed for FIFA world cup or UEFA Euro football/soccer competition. Users compete by predicting match scores. The platform tracks predictions, calculates points, and maintains rankings throughout a tournament.

### 🔴 UPDATED: Key Terminology
**IMPORTANT DISTINCTION:**
- **Tournament Stages**: The actual football tournament structure (Group Stage, Round of 16, Quarter Finals, Semi Finals, Final, etc.) - these are the official phases of the football tournament itself
- **Competition Rounds**: Admin-defined rounds for the ZGoogies prediction competition (Round 1, Round 2, Round 3, etc.) - these are how games are grouped for scoring, ranking, and prize distribution in the ZGoogies prediction game

The ZGoogies prediction competition is divided into multiple **Competition Rounds**, which are independent from the football tournament's stages. For example, a 64-game World Cup tournament might be divided into 4 Competition Rounds of 16 games each, regardless of which tournament stage those games belong to.

---

## 🔴 SUMMARY OF UPDATES

This document has been updated to clarify the **Competition Rounds System**. Key changes marked with 🔴:

### What Changed:
1. **Clear Terminology**: Distinguished "Tournament Stages" (football tournament phases) from "Competition Rounds" (admin-defined scoring periods)
2. **Competition Rounds System**: Added comprehensive section (§14) explaining how Competition Rounds work
3. **Scoring Logic**: Clarified that points are calculated for both the specific Competition Round AND overall competition
4. **Rankings**: Separate rankings maintained for each Competition Round + one overall ranking
5. **Double Points**: All games in the LAST Competition Round award 2x points (not specific games)
6. **Database Impact**: Identified required schema changes (competition_rounds table, games.competition_round_id, separate ranking records)

### Sections Updated:
- Overview (terminology added)
- Rules of the game (Competition Rounds structure)
- View Upcoming Games (shows Competition Round)
- Double Points (last Competition Round, not last tournament stage)
- Automatic Point Calculation (updates both rankings)
- Ranking System (per-round vs overall)
- Admin Score Entry (triggers both ranking updates)
- Competition Lifecycle (setup and scoring phases)
- Key Business Rules (scoring rules clarified)
- **NEW Section 14**: Complete Competition Rounds System explanation

---

### Registration fee
The entrance fee is 5 GBP (6.5 EUR, 7.5 USD, 9.5 AUD). It has to be paid to one of the Administors (see registration email) at the latest the day before the first game is played.
90% of the money collected will serve to constitue the different prices.
10% of the money will be given to Alexander Divine charity.

### Rules of the game
Each player makes a final score prediction on each game of the tournament (the final score includes extra time if applicable and excludes penalty results).
Predictions can be done up to 2 hours before the start of the game. Past this time, no prediction will be recorded, and this can not be overriden by the admin

The actual game result is then matched to the player's prediction to compute the player's points.
The points are allocated as follows:
- 7 points if the player matches exactly the game score
- 5 points if the player has predicted correct winner and the correct number of goals for one of the team only
- 4 points if player has predicted correct winner or draw but not corrects number of goals
- 2 point if the player has only succeeded to predict the number of goals for one team
- 1 point for a prediction that is false
- 0 point if player did not make any prediction

Each player can also predict on the team winning the football competition. This can be amended up until the day before the first game is played.
15 points are added to the overall ranking should you find the Winner of the competition.

### 🔴 UPDATED: Competition Rounds Structure
The prediction competition is divided into multiple **Competition Rounds** plus one overall competition:
- There is one main **overall competition** spanning all games
- There are multiple **Competition Rounds** (numbered 1, 2, 3, ..., N)
- Each Competition Round contains a specific set of games
- The administrator defines which games belong to which Competition Round BEFORE the competition starts
- Example: A 60-game World Cup could be divided into 4 Competition Rounds of 15 games each
- Competition Rounds are independent from the football tournament's tournament stages (Group Stage, Knockouts, etc.)

**Scoring by Competition Round:**
- When the admin enters the actual score of a game, the system computes points for:
  - The specific Competition Round that game belongs to
  - The overall competition (cumulative across all rounds)
- Each player accumulates separate point totals for each Competition Round and for the overall competition

**Rankings by Competition Round:**
- The system maintains separate rankings for:
  - Each individual Competition Round (based on points earned in that round only)
  - The overall competition (based on cumulative points across all rounds)
- Rankings are updated immediately when game scores are entered
- At the end of each Competition Round, winners are determined based on that round's ranking

**Prize Distribution:**
- 40% of the total amount of money collected will be redistributed to the winners of the overall competition
- 20% of the total amount of money collected will be redistributed to the winners of each Competition Round

For each Competition Round and the overall competition, the money will be redistributed between the top 5 players as follows:
- 45% for the first
- 25% for the second
- 15% for the third
- 10% for the fourth
- 5% for the fifth

In case several players have an equal ranking, they will divide between them the money assigned to the rankings they cover.

Note: The redistribution of money may be modified before the start of the game depending on the number of players registered: the more players registered the more winners we will have per round.

### 🔴 UPDATED: Double Points in Last Competition Round
**All games in the last Competition Round award double points (2x multiplier):**
- All points for games in the last Competition Round are multiplied by 2
- This applies to all scoring components (participation, result prediction, score accuracy, exact match bonus)
- Example: A perfect prediction normally worth 7 points becomes 14 points in the last round
- This only affects the last Competition Round, not the last tournament stage

---

## 1. USER REGISTRATION & ACCOUNT MANAGEMENT

### Registration System
- **Self-Registration Portal**
  - Users create accounts with username, first name, surname, and email
  - Must predict the tournament winner during registration
  - Must select their timezone (GMT-12 to GMT+12)
  - System generates a random 10 alphanumerical password
  - Automated email sent with login credentials and payment instructions
  - Registration email includes list of "cachiers" by region:
    - Bruno Spada (Nice)
    - Patrick Hebant or Nikolaus Samberger (London)
  
- **Registration Restrictions**
  - Registration closes once the tournament begins
  - Username must be unique
  - Tournament winner prediction required at registration and can be changed later

### User Authentication
- **Login System**
  - Standard username/password login
  - Session-based authentication
  - CAPTCHA check for human only registration check
  - Access tracking (logs all user logins)

- **Logout Functionality**
  - Secure logout with session termination
  - Access logging on logout

- **Password Management**
  - Password reset via username
  - System generates new random password
  - New password emailed to registered email address
  - Users can change password after login in account settings

### Account Settings
- **View/Edit Personal Information**
  - View username (cannot edit)
  - View first name (cannot edit)
  - View surname (cannot edit)
  - Update email address
  - Change password
  - Update timezone preference

- **Tournament Winner Prediction**
  - Select predicted tournament winner
  - Can change before tournament starts
  - Locked once tournament begins (prevents cheating)
  - Awards 15 bonus points if correct

- **View/Edit User Personas**
  - User can have either of these 3 personas: player, cachier, admin
  - A cachier is also player
  - An administartor is also cachier and player
  - Only admins can change the user's persona
  - Only cachier and admins can maanage payment status
  - Only admins can enter actual game results


### Payment Status
- **Payment Tracking**
  - Users see their payment status
  - Cannot make predictions until payment recorded
  - Payment recorded by "cachier" or "admin"
  - Email confirmation sent when payment received
  - "Payment admins" can view payment status of all users
   
---

## 2. GAME PREDICTION SYSTEM

### View Upcoming Games
- **Next Games List**
  - Shows all games not yet closed for predictions
  - Adjusted to user's timezone
  - Games close 2 hours before scheduled start time
  - Display includes:
    - Date and time (adjusted to user's timezone)
    - Location of the game
    - Team A vs Team B
    - 🔴 UPDATED: Competition Round (Round 1, Round 2, etc.)
    - Competition stage (Group Stage, Round of 16, etc.)
    - Group (if applicable)

- **User's Current Predictions**
  - Shows if user already predicted each game
  - Displays current prediction scores
  - Allows editing before deadline

### Make Predictions
- **Score Prediction Entry**
  - Enter predicted score for Team A
  - Enter predicted score for Team B
 
- **Prediction Submission**
  - no page reload
  - Creates new prediction or updates existing one
  - Records all predictions in history table tracking if prediction is new (N) or edited (E)

- **Prediction Validation**
  - Both scores must be numerical values
  - Cannot predict on closed games (current time is greater than game start time minus 2 hours)
  - Must have paid registration fee
  - Provides clear error messages:
    - "Predictions on this game are closed"
    - "Need to pay registration fee"
    - "Invalid prediction format"

### View Past Predictions
- **Closed Games Display**
  - Shows all games where prediction window closed (current time is after game start time minus 2 hours)
  - Displays in reverse chronological order (newest first)
  - Adjusted to user's timezone
  - For each game show:
    - Game details (teams, date, location)
    - User's prediction
    - Actual result (if game played)
    - Points earned (if computed)

- **View Other Players' Predictions**
  - Can view any player's past predictions (current time is after games start time minus 2 hours)
  - Access from player list
  - Shows same information as own predictions
  - Helps users compare strategies
- **View All predictions for a game**
  - Can view all prediction for a game predictions window (current time is after game start time minus 2 hours)
  - Access via the closed games display
  - Shows same information as own predictions

### Prediction History Tracking
- **Audit Trail**
  - Every prediction saved with timestamp
  - Tracks new predictions vs edits
  - Records date/time of each action
  - Maintains complete history even after edits

---

## 3. POINTS & SCORING SYSTEM

### Point Calculation
- **Participation Point**
  - 1 point for submitting any prediction

- **Result Prediction (3 points)**
  - Correct winner (Team A wins and predicted Team A wins)
  - Correct draw (actual draw and predicted draw)
  - Correct loser (Team B wins and predicted Team B wins)

- **Score Accuracy Points**
  - 1 point for correct Team A score
  - 1 point for correct Team B score

- **Exact Score Bonus**
  - 1 additional point for predicting exact score

- **Maximum Points Per Game**
  - Standard game: 7 points (1 + 3 + 1 + 1 + 1)
  - Double points games: 14 points

- **Tournament Winner Bonus**
  - 15 points for correctly predicting tournament winner

### 🔴 UPDATED: Double Points in Last Competition Round
- **Last Competition Round Gets 2x Points**
  - All games in the last Competition Round (e.g., Round 4 if there are 4 rounds) award double points
  - All points for games in the last Competition Round are multiplied by 2
  - This applies regardless of which tournament stage the games belong to
  - Example: If Round 4 contains games from Semi-Finals and Finals, all those games are worth 2x points

### 🔴 UPDATED: Automatic Point Calculation
- Points calculated when admin enters actual game scores
- System determines which Competition Round the game belongs to
- All predictions for that game updated simultaneously
- Points updated for:
  - The specific Competition Round containing that game
  - The overall competition (cumulative)
- Points immediately reflected in both Competition Round rankings and overall ranking
- Ability to rollback to correct wrong actual game entry
- No manual point adjustment needed

---

## 4. RANKING SYSTEM

### 🔴 UPDATED: Overall Ranking
- **Global Leaderboard**
  - All players ranked by cumulative total points across ALL Competition Rounds
  - Includes all games from all Competition Rounds
  - Updated after each game scored
  - Shows:
    - Current rank
    - Player name
    - Total points (sum across all rounds)
    - Last game processed

- **Rank Position Display**
  - Numerical rank (1st, 2nd, 3rd, etc.)
  - Handles tied positions correctly
  - If tied: multiple players share rank, next rank skips numbers
  - Example: Two players tied for 2nd, next player is 4th

### 🔴 UPDATED: Competition Round-Specific Rankings
- **Per-Round Leaderboards**
  - Separate rankings for each Competition Round (Round 1, Round 2, etc.)
  - Each Competition Round has its own independent ranking
  - Shows points earned only within that specific Competition Round
  - Competition Rounds are defined at setup by admins (which games belong to which round)
  - Allows viewing performance evolution after each game (up/down/neutral)
  - Winners determined at end of each Competition Round based on that round's ranking only

### Ranking Features
- **Current Rank Information**
  - Player's current position
  - Total points accumulated
  - Points breakdown available

- **Previous Rank Comparison**
  - Shows rank after previous game
  - Up/down arrow indicators
  - Helps track rank movement

- **Next Game Preview**
  - Shows predictions for next upcoming game
  - Allows comparing predictions with other players
  - Visible for all players in ranking view

### Ranking History Visualization
- **Rank Over Time Chart**
  - Graphical chart showing rank progression
  - X-axis: Games (numbered sequentially)
  - Y-axis: Rank position
  - Shows trend: improving, declining, stable
  - Available for any player for any round

- **Historical Snapshots**
  - Ranking saved after each game
  - Complete history maintained
  - Can view rank at any point in tournament

### User-Specific Rank Display
- **Personal Rank Highlight**
  - User's rank highlighted in rankings
  - Easy to find own position
  - Shows points needed to advance

- **Next Round Information**
  - If in middle of tournament, shows rank in next upcoming round
  - Helps users plan strategies

---

## 5. PLAYER INFORMATION

### Player List
- **All Players View**
  - Complete list of registered players
  - Sorted alphabetically by username
  - Shows:
    - Username
    - Full name (first name + surname)
    - Payment status (if competition not started)

- **Player Statistics**
  - Total number of players
  - Paid vs unpaid players (before competition)
  - Active players in competition

### Player Profiles
- **View Player Details**
  - Click on any player to view details
  - Access their past predictions
  - View their ranking history
  - Compare strategies with other players

### Tournament Winner Predictions
- **Winner Statistics**
  - Shows distribution of winner predictions
  - Count of players predicting each team
  - Only visible after tournament starts
  - Prevents influence on late registrations

---

## 6. GAME STATISTICS & ANALYTICS

### Game-Specific Statistics
- **Prediction Distribution**
  - Shows all score predictions for a game
  - Groups by predicted score (e.g., "2:1")
  - Shows count for each unique prediction
  - Identifies most popular prediction
  - Shows players with no prediction

- **Win/Draw/Loss Statistics**
  - Breakdown of predicted outcomes:
    - Percentage predicting Team A win
    - Percentage predicting draw
    - Percentage predicting Team B win
    - Percentage with no prediction

- **Filter by Prediction**
  - View only players who predicted specific score
  - Example: Show all who predicted "3:1"
  - Useful for finding like-minded predictors

### Individual Game Predictions
- **Detailed Player List per Game**
  - See every player's prediction for specific game
  - Sorted alphabetically
  - Shows who hasn't predicted
  - Available only after game closes for predictions

- **Comparison View**
  - Compare actual result with all predictions
  - Identify who earned points
  - See winning predictions

---

## 7. ADMINISTRATIVE FUNCTIONS

### Payment Management (Collector and admin Only)
- **Record Payment Interface**
  - List of all users
  - Mark user as "paid"
  - Record who received the payment
  - One-click payment recording

- **Payment Status Update**
  - Toggle payment status on/off
  - Send automatic email confirmation to user
  - Track payment admin
  - Immediate activation of prediction ability

- **Payment Tracking**
  - View who has paid
  - View who received each payment
  - Track payment by region

### Score Entry (admin Only)
- **Game Score List**
  - Shows all games without scores entered
  - Sorted by game date/time
  - Quick access for score entry

- **Enter Game Results**
  - Enter Team A score
  - Enter Team B score

- **🔴 UPDATED: Automatic Triggers on Score Entry**
  - Calculate points for all predictions
  - Determine which Competition Round the game belongs to
  - Update that specific Competition Round's rankings
  - Update overall rankings (cumulative across all rounds)
  - Save ranking history snapshot for both Competition Round and overall
  - All happens automatically in background
  - Enable rollback if admin made an error in the game actual result

### Tournament Winner Selection (admin Only)
- **Select Winner Interface**
  - Choose tournament winning team
  - One-time operation at end of tournament

- **Winner Bonus Distribution**
  - Automatically awards 15 points to correct predictors
  - Updates overall ranking
  - Saves ranking history
  - Recalculates final positions
  - Enable rollback in case of input error

### News publication (admin and cashier Only)
- **Publish news**
  - Enter text
  - Attach image (optional)


### Delete Registered User (admin Only)
- **User Deletion Interface**
  - List of all registered users
  - Delete button for each user
  - Cannot delete own admin account

- **Deletion Confirmation**
  - Confirmation prompt displays before deletion
  - Shows user details (username, full name, email)
  - Warns that deletion is permanent and irreversible
  - Requires explicit confirmation (Yes/No)

- **Deletion Process**
  - Removes user account permanently
  - Deletes all associated data:
    - User predictions
    - Prediction history
    - Ranking records
    - Payment information
    - Access logs
  - Action logged for audit trail
  - Success message displayed after deletion

- **Deletion Restrictions**
  - Admin cannot delete their own account
  - Confirmation required before deletion
  - Action cannot be undone
  - All user data permanently removed

### Admin Dashboard (admin only)
- **Administrative Overview**
  - Link to payment recording (only admin and cashier)
  - Link to score entry (only admin)
  - Link to winner selection (only admin)
  - Link to news publication (only admin and cashier)
  - Link to user management - delete users (only admin)
  - Access to DB interface (only admin)

---

## 8. NEWS & INFORMATION

### News Feed
- **Information Display**
  - Main communication channel
  - Updates about competition
  - Announcements
  - General information
  - Located in first tab of home page

### Rules Page
- **Game Rules**
  - Detailed explanation of how to play
  - Points system explanation
  - Deadlines and restrictions
  - Payment information
  - Available to public (no login required)

### Official Links
- **External Resources**
  - Link to official tournament website
  - Link opens in new window/tab
  - Provides match schedules and results

---

## 9. SYSTEM & TECHNICAL FEATURES

### User Interface
- **Device compatibility**
  - Responsive design, desktop and mobile compatible
  - Progressive Web App properties for mobile
  - Works and requires modern browser: Edge, Chrome, Safari or firefox

### Timezone Support
- **Automatic Time Adjustment**
  - All times stored in GMT/UTC
  - All time restrictions like game closure are computed in GMT/UTC
  - Displayed in user's selected timezone
  - Accurate across global user base
  - Options from GMT-12 to GMT+12

### Session Management
- **User Sessions**
  - Cookie-based sessions
  - Last state/tab remembered
  - Last viewed tab/state reopens on return
  - Secure session handling

### Dynamic updates
  - No page reloads for most actions
  - Fast and simple user experience
  - Dynamic content loading

### Access Tracking
- **Activity Logging**
  - Logs every page access
  - Records user and timestamp
  - Tracks login/logout
  - Tracks page navigation
  - Useful for analytics and debugging

### Email Notifications
- **Automated Emails**
  - Registration confirmation with password
  - Payment confirmation
  - Password reset
  - All sent automatically by system
  - No manual email needed

---

## 11. DATA MANAGEMENT

### Import Tools (Admin/Developer)
  - Import mechanism to load tournament data: teams, locations, games, stages etc...


### Database Management (Admin/Developer)
  - Full database access
  - Manual data entry/editing
  - User management
  - Data correction tools
  - Available at /root/ URL

---

## 12. USER EXPERIENCE FEATURES
- **Easy and simple Navigation**
- **Home page**
  - Latest 3 news snypets
  - Last games (min 0, max 3)
  - Next games (min 0, max 3)
  - Top 10 ranking of ongoing competition round
  - Top 10 ranking on overall ranking
  **Home page links or tabs**
  - Access to full News Feed
  - Next Games (predictions)
  - Closed Games (past predictions)
  - Ranking
  - Players
  - My Account
  - Content loads dynamically
  - Navigation state is saved in cookies

### Error Handling
- **User-Friendly Messages**
  - Clear error descriptions
  - Specific problem identification
  - Guidance on how to fix issues

---

## 13. COMPETITION LIFECYCLE
The platform handles the complete lifecycle of a prediction competition from registration through final scoring, with sophisticated ranking algorithms, comprehensive tracking, and role-based access control.

### 🔴 UPDATED: Pre-Competition Phase
1. **Setup**
   - Admin imports tournament data: teams, games schedule, tournament stages (Group Stage, Knockouts, etc.)
   - **Competition Rounds defined**: Admin creates numbered Competition Rounds (1, 2, 3, ..., N)
   - **Games assigned to Competition Rounds**: Each game is assigned to exactly one Competition Round
   - Example: 60 games divided into 4 Competition Rounds of 15 games each
   - System configured

2. **Registration Open**
   - Users register accounts
   - Users predict tournament winner
   - Users make payment arrangements
   - cachier records payments
   - registrations close 2 hours before the first game

### During Competition
1. **Active Prediction Phase**
   - Users submit predictions for upcoming games
   - Games close 2 hours before start
   - Users can edit predictions before deadline

2. **🔴 UPDATED: Scoring Phase**
   - Games played in real world
   - Admin enters actual scores
   - System determines which Competition Round the game belongs to
   - System calculates points automatically for:
     - The specific Competition Round containing that game
     - The overall ranking (cumulative across all rounds)
   - Rankings update immediately for both the Competition Round and overall ranking
   - Games in the last Competition Round award double points (2x multiplier)

3. **Ongoing Activities**
   - Users check rankings
   - Users view statistics
   - Users compare predictions
   - Rankings change after each game
   - User can not cheat because the system is secure

### Post-Competition
1. **Final Scoring**
   - Admin selects tournament winner
   - Winner bonus points awarded
   - Final rankings calculated

2. **Results Review**
   - Users view final standings
   - Users review all predictions
   - Statistics available for analysis
   - Historical data preserved

---

## 14. 🔴 NEW: COMPETITION ROUNDS SYSTEM

### Overview
The prediction competition is organized into multiple Competition Rounds, which are independent from the football tournament's tournament stages.

### Competition Round Definition
- **Created Before Competition Starts**: Admin defines all Competition Rounds during setup
- **Numbered Sequentially**: Round 1, Round 2, Round 3, ..., Round N
- **Fixed Game Assignment**: Each game is assigned to exactly one Competition Round
- **Independent from Tournament Stages**: A Competition Round can contain games from multiple tournament stages (e.g., Group Stage games + Round of 16 games)

### Example Configuration
**Scenario**: 2026 FIFA World Cup with 64 games
- **Competition Round 1**: Games 1-16 (Group Stage matches)
- **Competition Round 2**: Games 17-32 (Group Stage matches)
- **Competition Round 3**: Games 33-48 (Group Stage + Round of 16)
- **Competition Round 4**: Games 49-64 (Quarter Finals + Semi Finals + Final) - **DOUBLE POINTS**

### Scoring Mechanics
1. **When Admin Enters Game Score**:
   - System identifies which Competition Round the game belongs to
   - Calculates points for all players' predictions
   - Updates points for that specific Competition Round
   - Updates points for the overall competition (cumulative)

2. **Points Accumulation**:
   - Each player has separate point totals for each Competition Round
   - Overall points = Sum of points from all Competition Rounds
   - Example: Player X has 45 points in Round 1, 52 in Round 2 → 97 overall points

3. **Double Points in Last Round**:
   - All games in the last Competition Round award 2x points
   - A 7-point prediction becomes 14 points
   - Affects both the Competition Round ranking and overall ranking

### Ranking Management
1. **Competition Round Rankings**:
   - Each Competition Round has its own independent ranking
   - Based only on points earned within that specific round
   - Rankings updated after each game score entry
   - Winners determined at end of each round

2. **Overall Ranking**:
   - Single global ranking across all players
   - Based on cumulative points from all Competition Rounds
   - Updated simultaneously with Competition Round rankings
   - Final winners determined at tournament end

### Prize Distribution
- **Per Competition Round**: 20% of total prize pool distributed to top 5 players based on that round's ranking
- **Overall Competition**: 40% of total prize pool distributed to top 5 players based on overall ranking
- Winners determined independently for each Competition Round and overall

### Database Requirements
- **competition_rounds table**: Stores round number, name, start/end dates
- **games.competition_round_id**: Foreign key linking each game to its Competition Round
- **rankings table**: Separate records for each Competition Round + overall ranking
- **ranking_history table**: Snapshots for both Competition Round and overall rankings

---

## 15. KEY BUSINESS RULES

### Prediction Rules
- Must pay registration fee to predict
- Predictions close 2 hours before game
- Can edit predictions before deadline
- Cannot predict after deadline
- All predictions logged in history

### 🔴 UPDATED: Scoring Rules
- Points only awarded when admin enters scores
- Tournament winner prediction locked at competition start
- Games in the last Competition Round worth exactly 2x points
- Tied ranks allowed
- Ranking updates immediately after scoring
- Scoring and Ranking maintained per Competition Round and overall (cumulative)
- Each game contributes to both its Competition Round ranking and the overall ranking 

### Registration Rules
- Registration closes 2 hours before the first game starts
- Username must be unique
- Must predict tournament winner
- Password generated automatically
- Email verification via sent password

### Payment Rules
- Payment required to make predictions
- admin and cachier members record payments
- Email sent on payment confirmation
- Payment tracked per cashier

---

## 16. SECURITY & PERMISSIONS

### Public Access (No Login)
- View rules
- Register
- Login page
- Password reset

### Authenticated Users
- View dashboard
- View games and predictions
- View rankings
- View players
- Update account settings

### Paid Users Only
- Make predictions
- Edit predictions

### cachier Members
- All paid user features
- Record payments
- View payment status

### admins only
- All cachier features
- Enter game scores
- Select tournament winner
- Delete registered users
- Access Database admin
- Import data to database via dedicated interface

---

