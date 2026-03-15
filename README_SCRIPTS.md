# ZGoogies Start/Stop Scripts

Simple Python scripts to manage the ZGoogies application.

## Files

- **`start.py`** - Starts both backend and frontend servers
- **`stop.py`** - Stops both backend and frontend servers

## Usage

### Starting the Application

```bash
python start.py
```

This will:
- Start the Flask backend on port 5000
- Start the Vite frontend on port 5173
- Open both in separate console windows
- Display access URLs and login credentials

### Stopping the Application

```bash
python stop.py
```

This will:
- Find processes listening on ports 5000 and 5173
- Stop them gracefully
- Display status for each service

## Requirements

- Python 3.9+
- Backend dependencies installed (`backend/venv`)
- Node.js and npm installed (for frontend)
- Frontend dependencies installed (`frontend/node_modules`)

## First Time Setup

Before using these scripts, you need to:

1. **Set up Backend:**
   ```bash
   cd backend
   python -m venv venv
   source venv/Scripts/activate  # or venv\Scripts\activate on cmd
   pip install -r requirements.txt
   python init_db.py
   ```

2. **Set up Frontend:**
   ```bash
   cd frontend
   npm install
   ```

3. **Create Admin User:**
   ```bash
   cd backend
   source venv/Scripts/activate
   python create_admin.py
   ```

After initial setup, use `python start.py` and `python stop.py` for daily use.

## Troubleshooting

### "Port already in use"

If a port is already in use:

```bash
# Check what's using the ports
netstat -ano | findstr ":5000 :5173"

# Or use PowerShell
Get-NetTCPConnection -LocalPort 5000,5173 | Select-Object LocalPort, OwningProcess
```

### Scripts not working

Make sure you're running from the project root directory:

```bash
cd "C:\Users\nsamberger\OneDrive - Amadeus Workplace\zgoogies\2016app"
python stop.py
```

### Backend won't start

Check if virtual environment exists and has dependencies:

```bash
cd backend
ls venv/  # Should show Scripts/, Lib/, etc.
source venv/Scripts/activate
pip list | grep Flask  # Should show Flask and related packages
```

### Frontend won't start

Check if node_modules exists and npm is installed:

```bash
cd frontend
ls node_modules/  # Should show many packages
npm --version  # Should show version number
```

## Manual Alternative

If scripts don't work, you can start manually:

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

To stop: Press `Ctrl+C` in each terminal.

## Access URLs

Once started:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Login**: admin / admin123

## Platform Support

These scripts work on:
- ✓ Windows (netstat, taskkill)
- ✓ macOS (lsof, kill)
- ✓ Linux (lsof, kill)

The scripts automatically detect your platform and use appropriate commands.
