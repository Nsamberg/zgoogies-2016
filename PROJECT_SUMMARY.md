# ZGoogies — Project Status

**Last Updated**: March 24, 2026
**Repository**: `Nsamberg/zgoogies-2016` — branches: `dev` (active) / `production` (live)

---

## Current Status

| Component | Status |
|-----------|--------|
| Backend (Flask) | Live at https://zgoogies.online/api |
| Frontend (React/Vite) | Live at https://zgoogies.online |
| Database | SQLite — 104 games, 112 teams, 21 locations, 3 rounds |
| Git | All changes committed and pushed to `dev` + `production` |

**Production**: https://zgoogies.online
**Server**: Hetzner CX23 — IP 204.168.166.141
**Admin login**: `admin` / `admin123`
**Local dev**: `python start.py` (opens Flask on :5000 + Vite on :5173)

---

## What Is Built

### Backend — Python Flask
- Authentication: login (case-insensitive username), logout, register (strips whitespace), forgot password, change password, session restore
- Games: upcoming (open for predictions), closed, with round/stage/group metadata
- Predictions: submit, edit, fetch per user, fetch for other players (closed games only) — hardened against API injection (score validation, user_id locked to session)
- Rankings: overall + per-round, with game count per round, medal positions
- Players: list with roles, sorted alphabetically (case-insensitive), search by username
- News: article list
- Admin (full): payments, score entry + rollback, tournament winner + rollback, user management, news management, datetime override, full reset
- Email: Gmail SMTP via Flask-Mail, background thread (non-blocking) — all emails pass app context via `app._get_current_object()`
- CAPTCHA: reCAPTCHA v2 on login and register — backend verification skipped in DEBUG mode
- Datetime override: admin can simulate any UTC datetime via AppSetting; all time-sensitive logic routes through `get_current_utc()`

### Frontend — React 18 + TypeScript + Vite
| Page | Features |
|------|----------|
| Login | CAPTCHA, session restore on page load, password reveal toggle |
| Register | CAPTCHA, shows generated password on success |
| Forgot Password | Accepts username or email, sends new temp password by email |
| Predictions | Open Games tab, Closed Games tab (with all-players stats view), Other Players tab |
| Rankings | Overall + per-round tabs, medal badges, click player → ranking history charts |
| News | Article cards |
| Players | Username search, role filter (multi-select), alpha sorted, expandable rows |
| My Account | Profile tab (edit name/email/timezone/winner) + Change Password tab |
| Admin | 6 tabs: Payments · Score Entry · Tournament · News · Users · Settings |
| Rules | Scoring system, competition rounds, deadline and fee info |

**Admin tabs detail:**
| Tab | Access | Features |
|-----|--------|----------|
| Payments | Admin + Cashier | Mark paid/unpaid, search users, shows payment collector |
| Score Entry | Admin only | Enter scores by round/status filter, rollback individual game scores |
| Tournament | Admin only | Set tournament winner + award 15pt bonuses, rollback |
| News | Admin + Cashier | Create / edit / delete articles inline |
| Users | Admin only | Change roles, delete users with confirmation |
| Settings | Admin only | Datetime override (set/clear simulated time), Full Reset |

**Full Reset** (Admin > Settings): wipes all predictions, rankings, game scores and tournament winner. Requires typing `RESET ALL` to confirm.

**Datetime Override** (Admin > Settings): persists in database across restarts and logout/login cycles. Banner shown in header to all logged-in users when active. Also shown below logo on mobile.

**Theme**: FIFA World Cup 2026 — navy `#1B1464`, red `#C8102E`, gold `#D4AC0D`, Montserrat font
**Nav order**: Predictions · Rankings · Rules · News · Players · My Account · Admin
**Default route**: `/predictions`

---

## Production Deployment Status

> See `DEPLOY.md` for the full step-by-step guide.

### Step-by-step tracker

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| 0a | Buy domain | [x] done | zgoogies.online (Gandi registrar) |
| 0b | Create Hetzner CX23 server (Ubuntu 24.04) | [x] done | IP: 204.168.166.141 |
| 0c | Point domain DNS A records → server IP | [x] done | `@` and `www` → 204.168.166.141 |
| 0d | Register reCAPTCHA v2 keys for production domain | [x] done | Real keys in LoginPage.tsx + RegisterPage.tsx |
| 0e | Update `RECAPTCHA_SITE_KEY` in LoginPage.tsx + RegisterPage.tsx | [x] done | Key: `6LcAMVwUAAAAADmWmG4kqXh68Dtc03tmXw_T5lcd` |
| 0f | Merge `dev` → `production` and push | [x] done | Both branches up to date on GitHub |
| 1 | SSH into server — initial setup (user, packages) | [x] done | deploy user created, nginx + python3 + nodejs installed |
| 2 | Clone production branch, set up Python venv | [x] done | `/home/deploy/zgoogies/` |
| 3 | Create `.env` with real SECRET_KEY, Gmail app password, reCAPTCHA secret | [x] done | DATABASE_URL set to absolute path |
| 4 | Init DB (`init_db.py`, `create_admin.py`, `import_tournament_games.py`) | [x] done | 104 games, admin user created |
| 5 | Build React frontend (`npm run build`) | [x] done | dist served from `/home/deploy/zgoogies/frontend/dist` |
| 6 | Configure nginx site | [x] done | `/etc/nginx/sites-available/zgoogies` |
| 7 | Create and start gunicorn systemd service | [x] done | `systemctl enable zgoogies` — 3 workers on 127.0.0.1:5000 |
| 8 | Run certbot for HTTPS | [x] done | Certificate valid until 2026-06-21, auto-renew configured |
| 9 | Post-deploy verification | [x] done | Site live, login working, emails working |

### Production server details
- **Path**: `/home/deploy/zgoogies/` (repo root)
- **DB**: `/home/deploy/zgoogies/backend/zgoogies.db` (absolute path set in `.env`)
- **Service**: `systemctl status zgoogies`
- **Logs**: `journalctl -u zgoogies -n 50`
- **nginx config**: `/etc/nginx/sites-available/zgoogies`
- **Cert**: `/etc/letsencrypt/live/zgoogies.online/`
- **Deploy update**: `git pull origin production && cd frontend && npm run build && systemctl restart zgoogies`

### Known production gotchas
- nginx needs `chmod 755 /home/deploy` to serve frontend files
- SQLite path must be absolute in `.env`: `DATABASE_URL=sqlite:////home/deploy/zgoogies/backend/zgoogies.db`
- Email background threads require `app._get_current_object()` passed explicitly (app context issue)
- `instance/zgoogies.db` was created by Flask when using relative SQLite URI — deleted, absolute path used instead

---

## What Remains To Build

### Nice-to-Have (optional, post-launch)
- [ ] Ranking history charts — Recharts installed, backend snapshots exist
- [ ] Game prediction statistics/analytics

---

## Tournament Data

- **104 games** — FIFA World Cup 2026 full schedule
- **3 competition rounds**: Round 1 (36 games), Round 2 (36 games), Round 3 (32 games — double points)
- **112 teams** — all qualified + knockout placeholders
- **21 venues** — across USA, Canada, Mexico
- **Dates**: June 11 – July 19, 2026
- **Source**: `config/Tournament Games.json`

---

## Test Suite

| Suite | Command | Expected |
|-------|---------|----------|
| Backend (pytest) | `cd backend && venv/Scripts/python.exe -m pytest tests/test_auth.py tests/test_games.py tests/test_predictions.py tests/test_rankings.py tests/test_players.py tests/test_admin.py tests/test_datetime_utils.py` | 89 passed |
| Frontend (vitest) | `cd frontend && npm test` | 15 passed |
| TypeScript | `cd frontend && npx tsc --noEmit` | 0 errors |
| API smoke test | See CLAUDE.md | All 12 endpoints 200 |

Backend tests use an **in-memory SQLite database** (no running server needed). `TestingConfig` has `DEBUG=True` to enable CAPTCHA bypass in tests.

---

## Running Locally

```bash
python start.py
```

After cloning or pulling:
```bash
pip install -r backend/requirements.txt
cd frontend && npm install
```

---

## Corporate Network Limitations (dev only)

| Feature | Local | Production |
|---------|-------|------------|
| Gmail SMTP (port 587) | Blocked by firewall | Works |
| Google reCAPTCHA verification | Blocked by proxy | Works |

Both are bypassed silently in development (`DEBUG=True`). No code changes needed for production — just set real keys in `.env`.

---

## Production Deployment Checklist

### 1. Google reCAPTCHA — Real Keys

Site key: `6LcAMVwUAAAAADmWmG4kqXh68Dtc03tmXw_T5lcd`
Secret key: in `/home/deploy/zgoogies/backend/.env` as `RECAPTCHA_SECRET_KEY`

### 2. Backend — Environment Variables

`/home/deploy/zgoogies/backend/.env`:
```env
FLASK_ENV=production
SECRET_KEY=0335a526a2b6ce721494dc27921a63d3d9b1e683bc924130fa1e10a0b3e8e5ce
DATABASE_URL=sqlite:////home/deploy/zgoogies/backend/zgoogies.db

MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=zgoogiesgame@gmail.com
MAIL_PASSWORD=<gmail-app-password>
MAIL_DEFAULT_SENDER=zgoogiesgame@gmail.com

CORS_ORIGINS=https://zgoogies.online,https://www.zgoogies.online
SESSION_COOKIE_SECURE=True

RECAPTCHA_SECRET_KEY=6LcAMVwUAAAAAHs2Foz01-thRqpuTgX-_o-aPpVp
```

### 3. Deploying an update

```bash
# On the server as root or deploy user:
cd /home/deploy/zgoogies
git pull origin production
cd frontend && npm run build
systemctl restart zgoogies
```

### 4. Post-Deploy Verification

- [x] Login works with real CAPTCHA
- [x] Registration sends password email
- [x] Forgot password sends reset email
- [x] Payment confirmation email sent on marking paid
- [x] Predictions page loads games
- [x] Rankings tabs shown correctly
- [x] Admin page accessible only to admin/cashier users
- [x] Admin score entry updates rankings correctly
- [x] Datetime override banner shows in header when active
- [x] HTTPS active (certbot)
- [x] `SESSION_COOKIE_SECURE=True` in `.env`
- [x] Real reCAPTCHA keys in use
