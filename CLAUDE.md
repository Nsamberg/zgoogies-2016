# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

ZGoogies is a football tournament prediction game (World Cup, Euro, etc.) where players predict match scores to earn points and climb the rankings. Full-stack app with a Flask REST API backend and a React/TypeScript frontend.

- **Frontend**: http://localhost:5173 (Vite dev server)
- **Backend**: http://localhost:5000 (Flask)
- **Admin credentials**: `admin` / `admin123`
- **Root**: `/Users/niko/Github/zgoogies-2016`
- **Backend venv**: `backend/venv/bin/python`

## Architecture

### Backend (Flask)
- App factory pattern in `backend/app/__init__.py` registers 9 blueprints, all prefixed `/api`
- Blueprints: `auth`, `games`, `predictions`, `rankings`, `players`, `news`, `admin`, `teams`, `mcp`
- Layered: routes → services → SQLAlchemy models
- Session-based auth via Flask-Login; roles: Player, Cachier (cashier), Admin
- SQLite with WAL mode in dev; config in `backend/config.py`
- Prediction deadline is 2 hours before game kickoff (configurable in config)
- Datetime override system lets admins simulate time for testing; stored in DB and respected throughout scoring/deadline logic

### Frontend (React + TypeScript)
- Zustand stores in `src/stores/` manage auth state and datetime offset globally
- `src/services/` contains typed Axios wrappers for all API endpoints
- Routes in `src/App.tsx`: `ProtectedRoute` wraps all authenticated pages; `AdminRoute` gates `/admin`
- Path alias `@/` → `src/`
- PWA support via vite-plugin-pwa

### Scoring system
- Correct result: 4 pts | + correct goal difference: +2 pts | + exact score bonus: +1 pt | Wrong result: 0 pts | Max: 7 pts
- Rankings computed at round and overall level; history tracked per user

### MCP integration
`backend/app/routes/mcp.py` exposes an MCP (Model Context Protocol) server for AI assistant integration. Per-user API tokens are generated in Account → AI Assistant. Daily rate limits are stored via `AppSetting` (default 50 calls/day).

### Key backend patterns
- **Auth decorators**: `@admin_required` and `@cachier_required` (in `backend/app/routes/admin.py`) wrap `@login_required` and check roles — always use these, don't inline role checks
- **AppSetting**: Key-value store model with `AppSetting.get(key, default)` / `AppSetting.set(key, value)` — used for datetime override offset, AI rate limits, and other runtime config
- **Competition rounds vs stages**: `CompetitionRound` is admin-defined for scoring/prizes (e.g. "Round 1"); `Game.stage` is the actual football phase (e.g. "Group A", "Final"). The last `CompetitionRound` awards double points (`CompetitionRound.is_last_round()`).
- **Datetime override**: Stored as a seconds offset in `AppSetting('datetime_override_offset')`; `get_current_utc()` adds this offset to real time so simulated time advances normally. All deadline and scoring logic calls `get_current_utc()`.

### Testing
- `conftest.py` uses **session-scoped** `app`/`client` fixtures (shared across all tests, in-memory SQLite) and **function-scoped** `admin_client`/`player_client` auth fixtures (reset per test)
- Seed data: 3 users (admin, cashier, player), 5 teams, 3 games, 3 competition rounds
- Future games use `datetime(2026, 7, 15)`, past games use `datetime(2020, 6, 10)` to test deadline logic
- CAPTCHA is bypassed when `DEBUG=True`

### Config environments
Selected via `FLASK_ENV` env var (default: `development`). `TestingConfig` uses in-memory DB and disables CSRF. `ProductionConfig` enables secure cookies.

## Commands

### Start / stop everything
```bash
cd /Users/niko/Github/zgoogies-2016 && python start.py   # starts backend :5000 + frontend :5173
cd /Users/niko/Github/zgoogies-2016 && python stop.py
```

### Frontend (from `frontend/`)
```bash
npm run dev          # dev server
npx tsc --noEmit     # type-check
npm test             # vitest (watch mode)
npm run build        # production build
```

### Backend (from `backend/`)
```bash
venv/bin/python run.py                          # start server
venv/bin/python -m pytest tests/ -v             # all tests
venv/bin/python -m pytest tests/test_auth.py -v # single test file
venv/bin/python -m pytest tests/ -k "test_name" # single test by name
flask db migrate -m "message"                   # create migration
flask db upgrade                                # apply migrations
```

## Validation before committing

All of the following must pass:

1. **Frontend type-check + tests** (no server needed):
   ```bash
   cd /Users/niko/Github/zgoogies-2016/frontend && npx tsc --noEmit && npm test
   ```
   Expected: 0 TypeScript errors, 15 vitest tests pass.

2. **Backend unit tests** (no server needed):
   ```bash
   cd /Users/niko/Github/zgoogies-2016/backend && venv/bin/python -m pytest tests/test_auth.py tests/test_games.py tests/test_predictions.py tests/test_rankings.py tests/test_players.py tests/test_admin.py tests/test_datetime_utils.py -v
   ```
   Expected: 89 tests pass, 0 failed.

3. **API smoke test** (backend must be running on :5000):
   ```bash
   venv/bin/python -c "
   import requests, sys
   BASE = 'http://localhost:5000/api'
   s = requests.Session()
   s.post(f'{BASE}/auth/login', json={'username':'admin','password':'admin123','captcha_token':'test'})
   for path, label in [
       ('/auth/me','auth/me'), ('/games/upcoming','games/upcoming'), ('/games/closed','games/closed'),
       ('/predictions/','predictions'), ('/rankings/overall','rankings/overall'),
       ('/rankings/rounds','rankings/rounds'), ('/players/','players'), ('/news/','news'),
       ('/admin/users','admin/users'), ('/admin/games','admin/games'),
       ('/admin/datetime-override','datetime-override'), ('/teams/','teams'),
   ]:
       r = s.get(f'{BASE}{path}')
       print(f'  [{ \"OK\" if r.status_code == 200 else \"FAIL\"}] {r.status_code} {label}')
       assert r.status_code == 200
   print('All checks passed.')
   "
   ```
