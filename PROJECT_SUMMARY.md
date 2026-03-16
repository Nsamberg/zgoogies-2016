# ZGoogies — Project Status

**Last Updated**: March 16, 2026
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
- Predictions: submit, edit, fetch per user, fetch for other players (closed games only)
- Rankings: overall + per-round, with game count per round, medal positions
- Players: list with roles, search by username, expandable predictions
- News: article list
- Admin: placeholder routes
- Email: Yahoo SMTP via Flask-Mail, background thread (non-blocking)
- CAPTCHA: reCAPTCHA v2 on login and register — backend verification skipped in DEBUG mode

### Frontend — React 18 + TypeScript + Vite
| Page | Features |
|------|----------|
| Login | CAPTCHA, session restore on page load |
| Register | CAPTCHA, shows generated password on success |
| Forgot Password | Accepts username or email, sends new temp password by email |
| Predictions | Open Games tab, Past Games tab, Other Players tab |
| Rankings | Overall + per-round tabs (dynamic), medal badges, current user highlighted |
| News | Article cards |
| Players | Username search, role filter (multi-select), expandable rows |
| My Account | Profile tab (edit name/email/timezone/winner) + Change Password tab |
| Admin | Placeholder — not yet built |

**Theme**: FIFA World Cup 2026 — navy `#1B1464`, red `#C8102E`, gold `#D4AC0D`, Montserrat font
**Nav order**: Predictions · Rankings · News · Players · My Account · Admin
**Default route**: `/predictions`

---

## What Remains To Build

### Admin Page (highest priority)
- [ ] Payment management — mark users as paid/unpaid (cashier + admin)
- [ ] Score entry — enter actual results for played games (admin only)
- [ ] Score rollback — correct a wrong result entry (admin only)
- [ ] Tournament winner selection + rollback (admin only)
- [ ] User deletion with confirmation (admin only)
- [ ] News publication — create/edit/delete articles (cashier + admin)

### Nice-to-Have (after admin)
- [ ] Ranking history charts (Recharts is installed, not yet wired up)
- [ ] Game prediction statistics (distribution per game, all predictions view)

---

## Tournament Data

- **104 games** — FIFA World Cup 2026 full schedule
- **3 competition rounds**: Round 1 (36 games), Round 2 (36 games), Round 3 (32 games — double points)
- **112 teams** — all qualified + knockout placeholders
- **21 venues** — across USA, Canada, Mexico
- **Dates**: June 11 – July 19, 2026
- **Source**: `config/Tournament Games.json`

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
DATABASE_URL=<see section 3>

MAIL_SERVER=smtp.mail.yahoo.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=zgoogiesgame@yahoo.com
MAIL_PASSWORD=<yahoo-app-password>
MAIL_DEFAULT_SENDER=zgoogiesgame@yahoo.com

CORS_ORIGINS=https://your-production-domain.com
SESSION_COOKIE_SECURE=True

RECAPTCHA_SECRET_KEY=<your-real-recaptcha-secret>
```

Generate a secure SECRET_KEY:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

**Yahoo app password** (required — Yahoo blocks regular passwords):
1. Log into https://yahoo.com with `zgoogiesgame@yahoo.com`
2. Account Security → Generate app password → "Other app" → name it "ZGoogies"
3. Copy the 16-character password → paste as `MAIL_PASSWORD`

---

### 3. Database — Switch to PostgreSQL (recommended)

```sql
CREATE DATABASE zgoogies;
CREATE USER zgoogies_user WITH PASSWORD 'strong-password';
GRANT ALL PRIVILEGES ON DATABASE zgoogies TO zgoogies_user;
```

Add `psycopg2-binary` to `backend/requirements.txt`, then set:
```
DATABASE_URL=postgresql://zgoogies_user:strong-password@localhost/zgoogies
```

Re-run setup:
```bash
cd backend
python init_db.py
python create_admin.py
python import_tournament_games.py
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
- [ ] HTTPS active
- [ ] `SESSION_COOKIE_SECURE=True` in `.env`
- [ ] No test reCAPTCHA keys in use
