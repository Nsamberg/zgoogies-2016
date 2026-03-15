# ZGoogies - Quick Start Guide

Get your ZGoogies application up and running in minutes!

## 🚀 Easy Start/Stop (Recommended)

If your environment is already set up, use these simple scripts:

### Start Application
```bash
python start.py
```

This will:
- ✓ Start backend on http://localhost:5000
- ✓ Start frontend on http://localhost:5173
- ✓ Open in separate console windows

### Stop Application
```bash
python stop.py
```

This will:
- ✓ Stop backend server (port 5000)
- ✓ Stop frontend server (port 5173)

---

## Prerequisites

- Python 3.9+ installed
- Node.js 18+ installed
- Git Bash or similar terminal (for manual setup)

## Step-by-Step Setup

### 1. Backend Setup (5 minutes)

Open Git Bash and navigate to the backend directory:

```bash
cd "C:\Users\nsamberger\OneDrive - Amadeus Workplace\zgoogies\2016app\backend"
```

#### a) Create Virtual Environment

```bash
python -m venv venv
```

#### b) Activate Virtual Environment

```bash
source venv/Scripts/activate  # Git Bash on Windows
# or
venv\Scripts\activate  # Command Prompt on Windows
```

#### c) Install Dependencies

```bash
pip install -r requirements.txt
```

#### d) Create Environment File

```bash
cp .env.example .env
```

Edit the `.env` file with your settings:
```env
FLASK_ENV=development
SECRET_KEY=your-secret-key-change-this
DATABASE_URL=sqlite:///zgoogies.db

# Email settings (optional for now)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_DEFAULT_SENDER=noreply@zgoogies.com
```

#### e) Initialize Database

```bash
python init_db.py
```

#### f) Create Admin User

```bash
python create_admin.py
```

Follow the prompts. Default credentials:
- Username: `admin`
- Password: `admin123`
- Email: your email

#### h) Start Backend Server

```bash
python run.py
```

✅ Backend running at `http://localhost:5000`

---

### 2. Frontend Setup (3 minutes)

Open a **new terminal** window and navigate to frontend:

```bash
cd "C:\Users\nsamberger\OneDrive - Amadeus Workplace\zgoogies\2016app\frontend"
```

#### a) Install Dependencies

```bash
npm install
```

#### b) Start Development Server

```bash
npm run dev
```

✅ Frontend running at `http://localhost:5173`

---

### 3. Access the Application

| What | URL |
|------|-----|
| Application | http://localhost:5173 |
| Backend API | http://localhost:5000 |
| DB Browser (Flask-Admin) | http://localhost:5000/db-admin |

Login with:
- **Username**: `admin`
- **Password**: `admin123`

---

## Common Issues & Solutions

### Backend Issues

**Error: "No module named 'flask'"**
- Solution: Make sure virtual environment is activated
- Run: `source venv/Scripts/activate`

**Error: "sqlite3.OperationalError: no such table"**
- Solution: Database not initialized
- Run: `python init_db.py`

**Error: "Port 5000 is already in use"**
- Solution: Change port in `run.py` or kill the process using port 5000

### Frontend Issues

**Error: "Cannot find module"**
- Solution: Dependencies not installed
- Run: `npm install`

**Error: "ECONNREFUSED"**
- Solution: Backend server not running
- Start backend: `python run.py`

**Error: "Port 5173 is already in use"**
- Solution: Kill the process or use a different port
- Edit `vite.config.ts` to change port

---

## Directory Structure Quick Reference

```
2016app/
├── backend/               # Python Flask backend
│   ├── venv/             # Virtual environment (created)
│   ├── zgoogies.db       # SQLite database (created)
│   ├── app/              # Application code
│   ├── init_db.py        # Database initialization
│   ├── create_admin.py   # Admin user creation
│   └── run.py            # Start server
│
└── frontend/             # React TypeScript frontend
    ├── node_modules/     # Dependencies (created)
    ├── src/              # Source code
    └── package.json      # Dependencies
```

---

## What's Working Now

✅ User authentication (login/logout)
✅ Basic navigation
✅ Database with sample data
✅ API endpoints ready
✅ Admin user created

## What Needs Implementation

⏳ Registration form UI
⏳ Predictions interface
⏳ Rankings display
⏳ Game statistics
⏳ Admin dashboard UI
⏳ News management
⏳ Account settings

---

## Development Workflow

### Starting Your Dev Environment

**Terminal 1 (Backend):**
```bash
cd backend
source venv/Scripts/activate
python run.py
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

### Stopping Servers

**Option 1: Using stop script (recommended)**
```bash
python stop.py
```

**Option 2: Manual stop**
- Backend: `Ctrl+C` in terminal
- Frontend: `Ctrl+C` in terminal

**Option 3: PowerShell (if terminals are closed)**
```powershell
# Stop both services
Get-NetTCPConnection -LocalPort 5000,5173 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### Database Management

**Web-based DB browser (Flask-Admin):**

With the backend running, open: **http://localhost:5000/db-admin**

Provides a full table browser for all models (Users, Teams, Games, Predictions, Rankings, News, etc.) with search, filters, and CSV export. No authentication is required in development mode.

**Desktop SQLite browser (offline, no backend needed):**

Install [DB Browser for SQLite](https://sqlitebrowser.org) (free), then open:
```
backend\zgoogies.db
```

**Reset database:**
```bash
cd backend
rm zgoogies.db
python init_db.py
python create_admin.py
```

---

## Next Development Steps

1. **Complete Registration Page** (`frontend/src/pages/RegisterPage.tsx`)
   - Add form fields
   - Team selection dropdown
   - Timezone selector

2. **Build Predictions Interface** (`frontend/src/pages/PredictionsPage.tsx`)
   - Fetch upcoming games
   - Display game cards
   - Score input controls

3. **Create Rankings Display** (`frontend/src/pages/RankingsPage.tsx`)
   - Ranking table
   - Round selector
   - Charts with Recharts

4. **Admin Dashboard** (`frontend/src/pages/AdminPage.tsx`)
   - Payment management
   - Score entry form
   - Tournament winner selection

---

## Testing

### Test Backend API

```bash
# Test login endpoint
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Test games endpoint (requires authentication)
curl http://localhost:5000/api/games/upcoming \
  -H "Cookie: session=your-session-cookie"
```

### Test Frontend

1. Open `http://localhost:5173`
2. Login with admin credentials
3. Navigate through pages
4. Check browser console for errors

---

## Getting Help

- Check `README.md` for detailed documentation
- Review `FUNCTIONALITY_DOCUMENTATION.md` for feature specs
- See `PROJECT_SUMMARY.md` for development roadmap

---

## Production Deployment

When ready for production:

1. **Backend:**
   - Set `FLASK_ENV=production` in `.env`
   - Use PostgreSQL instead of SQLite
   - Deploy with Gunicorn
   - Set up HTTPS

2. **Frontend:**
   - Run `npm run build`
   - Serve `dist/` folder with nginx or similar
   - Update API base URL

---

Happy coding! ⚽🎯
