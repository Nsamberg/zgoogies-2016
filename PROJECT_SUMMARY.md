# ZGoogies — Project Status

**Last Updated**: March 21, 2026
**Repository**: `Nsamberg/zgoogies-2016` — branches: `dev` (active) / `production` (deployment pending)

---

## Current Status

| Component | Status |
|-----------|--------|
| Backend (Flask) | Running on http://localhost:5000 |
| Frontend (React/Vite) | Running on http://localhost:5173 |
| Database | SQLite — 104 games, 112 teams, 21 locations, 3 rounds |
| Git | All changes committed and pushed to `dev` |

**Start the app**: `python start.py` (opens two console windows: Flask + Vite)
**Login**: `admin` / `admin123`
**DB browser**: http://localhost:5000/db-admin (DEBUG mode only)

---

## What Is Built

### Backend — Python Flask
- Authentication: login, logout, register, forgot password, change password, session restore
- Games: upcoming (open for predictions), closed, with round/stage/group metadata
- Predictions: submit, edit, fetch per user, fetch for other players (closed games only) — hardened against API injection (score validation, user_id locked to session)
- Rankings: overall + per-round, with game count per round, medal positions
- Players: list with roles, sorted alphabetically (case-insensitive), search by username
- News: article list
- Admin (full): payments, score entry + rollback, tournament winner + rollback, user management, news management, datetime override, full reset
- Email: Gmail SMTP via Flask-Mail, background thread (non-blocking)
- CAPTCHA: reCAPTCHA v2 on login and register — backend verification skipped in DEBUG mode
- Datetime override: admin can simulate any UTC datetime via AppSetting; all time-sensitive logic routes through `get_current_utc()`

### Frontend — React 18 + TypeScript + Vite
| Page | Features |
|------|----------|
| Login | CAPTCHA, session restore on page load, restores datetime override state |
| Register | CAPTCHA, shows generated password on success |
| Forgot Password | Accepts username or email, sends new temp password by email |
| Predictions | Open Games tab, Closed Games tab (with all-players stats view), Other Players tab |
| Rankings | Overall + per-round tabs, medal badges, click player → ranking history charts |
| News | Article cards |
| Players | Username search, role filter (multi-select), alpha sorted, expandable rows |
| My Account | Profile tab (edit name/email/timezone/winner) + Change Password tab |
| Admin | 6 tabs: Payments · Score Entry · Tournament · News · Users · Settings |

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

**Datetime Override** (Admin > Settings): persists in database across restarts and logout/login cycles. Banner shown in header to all logged-in users when active.

**Theme**: FIFA World Cup 2026 — navy `#1B1464`, red `#C8102E`, gold `#D4AC0D`, Montserrat font
**Nav order**: Predictions · Rankings · News · Players · My Account · Admin
**Default route**: `/predictions`

---

## Production Deployment Status

> See `DEPLOY.md` for the full step-by-step guide.

### Step-by-step tracker

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| 0a | Buy domain (e.g. zgoogies.online) | [ ] pending | Needed before reCAPTCHA registration |
| 0b | Create Hetzner CX23 server (Ubuntu 24.04) | [ ] pending | Note the public IP once created |
| 0c | Point domain DNS A records → server IP | [ ] pending | Both `@` and `www` |
| 0d | Register reCAPTCHA v2 keys for production domain | [ ] pending | https://www.google.com/recaptcha/admin |
| 0e | Update `RECAPTCHA_SITE_KEY` in LoginPage.tsx + RegisterPage.tsx | [ ] pending | Currently using Google test key |
| 0f | Merge `dev` → `production` and push | [ ] pending | Run after 0e |
| 1 | SSH into server — initial setup (user, packages) | [ ] pending | See DEPLOY.md Part 3 |
| 2 | Clone production branch, set up Python venv | [ ] pending | See DEPLOY.md Part 4a–4b |
| 3 | Create `.env` with real SECRET_KEY, Gmail app password, reCAPTCHA secret | [ ] pending | See DEPLOY.md Part 4c |
| 4 | Init DB (`init_db.py`, `create_admin.py`, `import_tournament_games.py`) | [ ] pending | See DEPLOY.md Part 4d |
| 5 | Build React frontend (`npm run build`) | [ ] pending | See DEPLOY.md Part 4e |
| 6 | Configure nginx site | [ ] pending | See DEPLOY.md Part 5 |
| 7 | Create and start gunicorn systemd service | [ ] pending | See DEPLOY.md Part 6 |
| 8 | Run certbot for HTTPS | [ ] pending | See DEPLOY.md Part 7 |
| 9 | Post-deploy verification checklist | [ ] pending | See DEPLOY.md Part 8 |

### Current blockers (need user action)
- [ ] Buy domain
- [ ] Create Hetzner CX23 server → get public IP
- [ ] Point DNS A records to server IP
- [ ] Register reCAPTCHA v2 keys at https://www.google.com/recaptcha/admin

### Ready to go (no blockers)
- reCAPTCHA test keys confirmed in both `LoginPage.tsx` and `RegisterPage.tsx` — ready to swap once real keys are available
- `backend/.env.example` has all required fields for production
- `DEPLOY.md` at project root has full copy-paste deployment guide
- `production` branch exists on GitHub, ready to receive merge from `dev`

## What Remains To Build

### Nice-to-Have (optional, post-launch)
- [x] Ranking history charts — **done** (Recharts line charts: points + rank over time)
- [x] Game prediction statistics — **done** (stats panel on closed game predictions view)

### Nice-to-Have (optional, post-launch)
- [x] Ranking history charts — **done** (Recharts line charts: points + rank over time)
- [x] Game prediction statistics — **done** (stats panel on closed game predictions view)

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
| Yahoo SMTP (port 587/465) | Blocked by firewall | Works |
| Google reCAPTCHA verification | Blocked by proxy | Works |

Both are bypassed silently in development (`DEBUG=True`). No code changes needed for production — just set real keys in `.env`.

---

## Production Deployment Checklist

### 1. Google reCAPTCHA — Real Keys

1. Go to https://www.google.com/recaptcha/admin
2. Create site → reCAPTCHA v2 "I'm not a robot" → add your production domain
3. Copy Site Key and Secret Key

**Frontend** — update in both login and register pages:
```typescript
const RECAPTCHA_SITE_KEY = '<your-real-site-key>'
```
(`frontend/src/pages/LoginPage.tsx` and `frontend/src/pages/RegisterPage.tsx`)

**Backend** — set in `backend/.env`:
```
RECAPTCHA_SECRET_KEY=<your-real-secret-key>
```

---

### 2. Backend — Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

```env
FLASK_ENV=production
SECRET_KEY=<long-random-string-min-32-chars>
# DATABASE_URL is optional — defaults to sqlite:///zgoogies.db if not set

MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=zgoogiesgame@gmail.com
MAIL_PASSWORD=<gmail-app-password>
MAIL_DEFAULT_SENDER=zgoogiesgame@gmail.com

CORS_ORIGINS=https://your-production-domain.com
SESSION_COOKIE_SECURE=True

RECAPTCHA_SECRET_KEY=<your-real-recaptcha-secret>
```

Generate a secure SECRET_KEY:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

**Gmail app password** (required — Google blocks regular passwords for SMTP):
1. Ensure 2-factor authentication is enabled on `zgoogiesgame@gmail.com`
2. Go to https://myaccount.google.com/apppasswords
3. Create an app password → name it "ZGoogies"
4. Copy the 16-character password → paste as `MAIL_PASSWORD`

---

### 3. Database — SQLite (production)

SQLite is used in production. No migration needed — it works out of the box.

Run the setup scripts on the server to initialise the database:
```bash
cd backend
python init_db.py
python create_admin.py
python import_tournament_games.py
```

The `DATABASE_URL` in `.env` can be left unset (defaults to `sqlite:///zgoogies.db` inside the backend folder) or set explicitly:
```
DATABASE_URL=sqlite:////path/to/zgoogies.db
```

---

### 4. Backend — Production Server (Gunicorn)

```bash
pip install gunicorn
gunicorn -w 4 -b 127.0.0.1:5000 "app:create_app('production')"
```

Systemd service (`/etc/systemd/system/zgoogies.service`):
```ini
[Unit]
Description=ZGoogies Flask App

[Service]
User=www-data
WorkingDirectory=/path/to/2016app/backend
ExecStart=/path/to/venv/bin/gunicorn -w 4 -b 127.0.0.1:5000 "app:create_app('production')"
Restart=always

[Install]
WantedBy=multi-user.target
```

---

### 5. Frontend — Production Build

```bash
cd frontend
npm run build        # outputs to frontend/dist/
```

Serve `frontend/dist/` via nginx or a static host (Vercel, Netlify, etc.).

**nginx config**:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /path/to/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

### 6. SSL / HTTPS

```bash
sudo certbot --nginx -d your-domain.com
```

Also set in `backend/.env`:
```
SESSION_COOKIE_SECURE=True
```

---

### 7. Deploy from production branch

```bash
git checkout production
git merge dev
git push origin production
```

---

### 8. Post-Deploy Verification

- [ ] Login works with real CAPTCHA
- [ ] Registration sends password email
- [ ] Forgot password sends reset email
- [ ] Predictions page loads games
- [ ] Rankings tabs shown correctly
- [ ] Admin page accessible only to admin/cashier users
- [ ] Admin score entry updates rankings correctly
- [ ] Datetime override banner shows in header when active
- [ ] HTTPS active
- [ ] `SESSION_COOKIE_SECURE=True` in `.env`
- [ ] No test reCAPTCHA keys in use
- [ ] Run full reset once to confirm clean slate before going live
