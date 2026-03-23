# ZGoogies — Hetzner Production Deployment Guide

## Overview

- **Server**: Hetzner CX23 (Ubuntu 24.04 LTS, 2 vCPU, 2 GB RAM) — IP: `204.168.166.141`
- **Architecture**: nginx (static React + reverse proxy) → gunicorn (Flask) → SQLite
- **Domain**: `zgoogies.online` / `www.zgoogies.online`

---

## Parts 0–2 — COMPLETED

- [x] Real reCAPTCHA site key set in `LoginPage.tsx` + `RegisterPage.tsx`
- [x] `dev` merged → `production` pushed to GitHub
- [x] Hetzner CX23 created — IP: `204.168.166.141`
- [x] DNS A records (`@` and `www`) → `204.168.166.141` for `zgoogies.online`

---

## Part 3 — Initial Server Setup

SSH into the server:
```bash
ssh root@204.168.166.141
```

### 3a. Update system and create a non-root user
```bash
apt update && apt upgrade -y

# Create a deploy user
adduser deploy
usermod -aG sudo deploy

# Copy your SSH key to the deploy user (so you can SSH as deploy)
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

### 3b. Install required packages
```bash
apt install -y nginx python3 python3-venv python3-pip nodejs npm git certbot python3-certbot-nginx
```

Verify Node version (needs 18+):
```bash
node --version
```
If below 18, install a newer version:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

---

## Part 4 — Deploy the Application

Switch to the deploy user for all remaining steps:
```bash
su - deploy
```

### 4a. Clone the production branch
```bash
cd /home/deploy
git clone -b production https://github.com/Nsamberg/zgoogies-2016.git zgoogies
cd zgoogies
```

### 4b. Set up the Python backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn
deactivate
```

### 4c. Create the production .env file
```bash
cd /home/deploy/zgoogies/backend
cp .env.example .env
nano .env
```

Fill in the file with these values (replace placeholders):
```env
FLASK_ENV=production
SECRET_KEY=<paste-the-64-char-hex-you-generated-in-step-0b>

MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=zgoogiesgame@gmail.com
MAIL_PASSWORD=<your-16-char-gmail-app-password>
MAIL_DEFAULT_SENDER=zgoogiesgame@gmail.com

CORS_ORIGINS=https://zgoogies.online,https://www.zgoogies.online
SESSION_COOKIE_SECURE=True

RECAPTCHA_SECRET_KEY=<your-real-recaptcha-secret-key>
```

Save and exit: `Ctrl+O`, `Enter`, `Ctrl+X`

### 4d. Initialise the database
```bash
cd /home/deploy/zgoogies/backend
source venv/bin/activate
python init_db.py
python create_admin.py
python import_tournament_games.py
deactivate
```

Expected output from `init_db.py`: tables created
Expected output from `create_admin.py`: admin user created
Expected output from `import_tournament_games.py`: 104 games imported

### 4e. Build the React frontend
```bash
cd /home/deploy/zgoogies/frontend
npm install
npm run build
```

The production build will be output to `frontend/dist/`.

---

## Part 5 — Configure nginx

Switch back to root (or use sudo):
```bash
exit   # back to root, or prefix commands below with sudo
```

### 5a. Create the nginx site config
```bash
nano /etc/nginx/sites-available/zgoogies
```

Paste the following:
```nginx
server {
    listen 80;
    server_name zgoogies.online www.zgoogies.online;

    root /home/deploy/zgoogies/frontend/dist;
    index index.html;

    # Serve React SPA — all unknown paths return index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Flask/gunicorn
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Block direct access to backend files
    location ~ /\. {
        deny all;
    }
}
```

Save and exit.

### 5b. Enable the site and test
```bash
ln -s /etc/nginx/sites-available/zgoogies /etc/nginx/sites-enabled/
nginx -t          # should say: configuration file test is successful
systemctl reload nginx
```

---

## Part 6 — Set Up the Gunicorn Systemd Service

```bash
nano /etc/systemd/system/zgoogies.service
```

Paste:
```ini
[Unit]
Description=ZGoogies Flask App
After=network.target

[Service]
User=deploy
Group=deploy
WorkingDirectory=/home/deploy/zgoogies/backend
Environment="PATH=/home/deploy/zgoogies/backend/venv/bin"
ExecStart=/home/deploy/zgoogies/backend/venv/bin/gunicorn \
    --workers 2 \
    --bind 127.0.0.1:5000 \
    --timeout 60 \
    --access-logfile /var/log/zgoogies/access.log \
    --error-logfile /var/log/zgoogies/error.log \
    "app:create_app('production')"
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Create the log directory and start the service:
```bash
mkdir -p /var/log/zgoogies
chown deploy:deploy /var/log/zgoogies

systemctl daemon-reload
systemctl enable zgoogies
systemctl start zgoogies
systemctl status zgoogies    # should show: active (running)
```

Verify Flask is responding on port 5000:
```bash
curl -s http://127.0.0.1:5000/api/games/upcoming | head -c 100
```

---

## Part 7 — Enable HTTPS with Let's Encrypt

```bash
certbot --nginx -d zgoogies.online -d www.zgoogies.online
```

Follow the prompts:
- Enter your email address
- Agree to terms
- Choose option 2 (redirect HTTP to HTTPS)

certbot automatically updates the nginx config and renews certificates.

Test renewal:
```bash
certbot renew --dry-run
```

---

## Part 8 — Post-Deploy Verification

Run through this checklist manually in your browser:

- [ ] https://zgoogies.online loads the login page
- [ ] Login works (admin / admin123) — reCAPTCHA must pass
- [ ] Predictions page shows upcoming games
- [ ] Register a new user — confirmation email arrives
- [ ] Forgot password — reset email arrives
- [ ] Rankings tabs show correctly
- [ ] Players page loads
- [ ] Admin page accessible with admin account
- [ ] Enter a score in Admin > Score Entry — rankings update
- [ ] HTTPS padlock shown in browser
- [ ] HTTP redirects to HTTPS automatically

---

## Part 9 — Updating the Application (future deploys)

When you push new changes:
```bash
# On your local machine:
git checkout production
git merge dev
git push origin production

# On the server (as deploy user):
ssh deploy@204.168.166.141
cd /home/deploy/zgoogies
git pull origin production

# If backend changed:
cd backend
source venv/bin/activate
pip install -r requirements.txt   # only if requirements changed
deactivate
sudo systemctl restart zgoogies

# If frontend changed:
cd ../frontend
npm install                        # only if package.json changed
npm run build

# Always reload nginx after frontend rebuild:
sudo systemctl reload nginx
```

---

## Quick Reference

| Item | Value |
|------|-------|
| Server user | `deploy` |
| App directory | `/home/deploy/zgoogies` |
| Frontend build | `/home/deploy/zgoogies/frontend/dist` |
| Backend venv | `/home/deploy/zgoogies/backend/venv` |
| .env file | `/home/deploy/zgoogies/backend/.env` |
| SQLite database | `/home/deploy/zgoogies/backend/zgoogies.db` |
| nginx config | `/etc/nginx/sites-available/zgoogies` |
| systemd service | `/etc/systemd/system/zgoogies.service` |
| App logs | `/var/log/zgoogies/` |
| Gunicorn workers | 2 (sufficient for 200 users) |
| SSL renewal | Automatic via certbot cron |

## Useful Commands on the Server

```bash
# Check if Flask is running
sudo systemctl status zgoogies

# Restart Flask (after backend changes)
sudo systemctl restart zgoogies

# View Flask logs live
sudo tail -f /var/log/zgoogies/error.log

# Check nginx status
sudo systemctl status nginx

# Reload nginx (after frontend rebuild or config change)
sudo systemctl reload nginx

# Check SSL certificate expiry
sudo certbot certificates

# Manual database backup
cp /home/deploy/zgoogies/backend/zgoogies.db ~/zgoogies_backup_$(date +%Y%m%d).db
```
