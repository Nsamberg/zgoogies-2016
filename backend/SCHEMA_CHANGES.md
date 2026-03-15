# Database Schema Changes - Competition Rounds System

## Date: 2026-03-13

## Overview
Updated database schema to implement the Competition Rounds system as specified in FUNCTIONALITY_DOCUMENTATION.md.

---

## Changes Made

### 1. `competition_rounds` Table - UPDATED ✅

**OLD Schema:**
```python
id = Integer (PK)
name = String(100)  # e.g., "Group Stage", "Round of 16"
order = Integer  # For ordering rounds
is_current = Boolean
created_at = DateTime
```

**NEW Schema:**
```python
id = Integer (PK)
name = String(100)  # e.g., "Round 1", "Round 2", "Round 3"
round_number = Integer (UNIQUE, NOT NULL)  # 1, 2, 3, etc.
start_date = DateTime (NULLABLE)  # Optional date range
end_date = DateTime (NULLABLE)
is_current = Boolean
created_at = DateTime
```

**Changes:**
- Renamed `order` → `round_number` for clarity
- Added UNIQUE constraint on `round_number`
- Added `start_date` and `end_date` fields (nullable)
- Updated comments to reflect Competition Rounds (not Tournament Stages)

**New Methods:**
- `is_last_round()` - Check if this is the last Competition Round (for double points)
- `get_last_round()` - Static method to get the last Competition Round

---

### 2. `games` Table - UPDATED ✅

**OLD Schema:**
```python
id = Integer (PK)
team_a_id = ForeignKey(teams.id)
team_b_id = ForeignKey(teams.id)
game_date = DateTime
location_id = ForeignKey(locations.id)
competition_round_id = ForeignKey(competition_rounds.id)
stage = String(50)  # e.g., "Group A", "Final"
group = String(10)
team_a_score = Integer (NULLABLE)
team_b_score = Integer (NULLABLE)
is_scored = Boolean
is_double_points = Boolean  # <-- REMOVED
created_at = DateTime
updated_at = DateTime
scored_at = DateTime (NULLABLE)
```

**NEW Schema:**
```python
id = Integer (PK)
team_a_id = ForeignKey(teams.id)
team_b_id = ForeignKey(teams.id)
game_date = DateTime
location_id = ForeignKey(locations.id)
competition_round_id = ForeignKey(competition_rounds.id)
stage = String(50)  # Tournament Stage (Group A, Quarter Final, etc.)
group = String(10)
team_a_score = Integer (NULLABLE)
team_b_score = Integer (NULLABLE)
is_scored = Boolean
# is_double_points field REMOVED
created_at = DateTime
updated_at = DateTime
scored_at = DateTime (NULLABLE)
```

**Changes:**
- **REMOVED** `is_double_points` field (was Boolean)
- Now computed dynamically via method
- Updated `stage` field comment to clarify it represents Tournament Stage

**New Methods:**
- `is_double_points()` - Dynamically checks if game is in last Competition Round

---

## Migration Strategy

### For NEW Installations (No Existing Database)
✅ **No migration needed!** Just run:
```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # Windows Git Bash
pip install -r requirements.txt
python init_db.py  # Creates tables with NEW schema
python create_admin.py  # Creates admin user
```

### For EXISTING Databases
⚠️ **Manual migration required** if you already have a database with the old schema:

```sql
-- 1. Rename column in competition_rounds table
ALTER TABLE competition_rounds RENAME COLUMN "order" TO round_number;

-- 2. Add new columns to competition_rounds table
ALTER TABLE competition_rounds ADD COLUMN start_date DATETIME NULL;
ALTER TABLE competition_rounds ADD COLUMN end_date DATETIME NULL;

-- 3. Add unique constraint on round_number
CREATE UNIQUE INDEX idx_competition_rounds_round_number ON competition_rounds(round_number);

-- 4. Remove is_double_points column from games table
ALTER TABLE games DROP COLUMN is_double_points;
```

**Note:** SQLite doesn't support `ALTER TABLE DROP COLUMN`, so for SQLite you'll need to:
1. Create a new table with the correct schema
2. Copy data from old table
3. Drop old table
4. Rename new table

---

## Terminology Clarification

### Tournament Stages
- **What:** Actual football tournament phases
- **Examples:** Group Stage, Round of 16, Quarter Finals, Semi Finals, Final
- **Where:** Stored in `games.stage` field
- **Purpose:** Describes the tournament structure

### Competition Rounds
- **What:** Admin-defined rounds for the ZGoogies prediction competition
- **Examples:** Round 1, Round 2, Round 3, Round 4
- **Where:** Stored in `competition_rounds` table, referenced by `games.competition_round_id`
- **Purpose:** Groups games for scoring, ranking, and prize distribution

**Key Point:** Competition Rounds are independent from Tournament Stages. A Competition Round can contain games from multiple Tournament Stages.

---

## Impact Summary

### ✅ Models Updated
- [x] `CompetitionRound` model
- [x] `Game` model
- [x] `Ranking` model (already correct)
- [x] `RankingHistory` model (already correct)

### ✅ Services Updated
- [x] `ranking_service.py` - Added missing Game import

### ✅ Routes Updated
- [x] `admin.py` - Score entry now uses `game.is_double_points()` method

### ✅ Frontend Updated
- [x] `types/index.ts` - Updated Game and CompetitionRound interfaces

### ✅ Scripts Updated
- [x] Database initialization scripts updated to use new schema with Competition Rounds

---

## Testing Checklist

- [ ] Create Competition Rounds (Round 1, Round 2, Round 3, Round 4)
- [ ] Assign games to different Competition Rounds
- [ ] Verify games in last round show as double points
- [ ] Enter game scores and verify points are calculated correctly
- [ ] Verify 2x points applied to last Competition Round games
- [ ] Check rankings update for both Competition Round and overall
- [ ] Verify ranking history is saved correctly

---

## Questions?

See [FUNCTIONALITY_DOCUMENTATION.md](../FUNCTIONALITY_DOCUMENTATION.md) Section 14 for complete Competition Rounds System documentation.
