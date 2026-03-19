# ZGoogies — Claude Code Instructions

## After every frontend change

Run the TypeScript compiler to catch type errors, missing imports, and broken components:

```bash
cd "c:/Users/nsamberger/OneDrive - Amadeus Workplace/zgoogies/2016app/frontend" && npx tsc --noEmit
```

Zero output = all clear. Any errors must be fixed before moving on.

## After every backend change

Run the API smoke test to verify all endpoints return 200:

```bash
"c:/Users/nsamberger/OneDrive - Amadeus Workplace/zgoogies/2016app/backend/venv/Scripts/python.exe" -c "
import requests, sys
sys.stdout.reconfigure(encoding='utf-8')
BASE = 'http://localhost:5000/api'
s = requests.Session()
r = s.post(f'{BASE}/auth/login', json={'username':'admin','password':'admin123','captcha_token':'test'})
assert r.status_code == 200, f'Login failed: {r.status_code}'
for path, label in [
    ('/auth/me','auth/me'), ('/games/upcoming','games/upcoming'), ('/games/closed','games/closed'),
    ('/predictions/','predictions'), ('/rankings/overall','rankings/overall'),
    ('/rankings/rounds','rankings/rounds'), ('/players/','players'), ('/news/','news'),
    ('/admin/users','admin/users'), ('/admin/games','admin/games'),
    ('/admin/datetime-override','datetime-override'), ('/teams/','teams'),
]:
    resp = s.get(f'{BASE}{path}')
    status = 'OK' if resp.status_code == 200 else 'FAIL'
    print(f'  [{status}] {resp.status_code} {label}')
    assert resp.status_code == 200, f'{label} returned {resp.status_code}'
s.post(f'{BASE}/auth/logout')
print('All checks passed.')
"
```

The backend must be running on port 5000. If not, start it first:
```bash
cd "c:/Users/nsamberger/OneDrive - Amadeus Workplace/zgoogies/2016app/backend" && venv/Scripts/python.exe run.py
```

## Before every commit/push

Run **both** checks above and confirm zero TypeScript errors and all API endpoints return 200.

## After any significant change (frontend or backend)

Run the full validation sequence in order:

### 1. Start the application
```bash
cd "c:/Users/nsamberger/OneDrive - Amadeus Workplace/zgoogies/2016app" && python start.py
```
Expected: both backend (port 5000) and frontend (port 5173) start without errors.

### 2. TypeScript check (frontend)
```bash
cd "c:/Users/nsamberger/OneDrive - Amadeus Workplace/zgoogies/2016app/frontend" && npx tsc --noEmit
```
Expected: zero output (zero errors).

### 3. API smoke test (backend) — requires backend running on port 5000
```bash
"c:/Users/nsamberger/OneDrive - Amadeus Workplace/zgoogies/2016app/backend/venv/Scripts/python.exe" -c "
import requests, sys
sys.stdout.reconfigure(encoding='utf-8')
BASE = 'http://localhost:5000/api'
s = requests.Session()
r = s.post(f'{BASE}/auth/login', json={'username':'admin','password':'admin123','captcha_token':'test'})
assert r.status_code == 200, f'Login failed: {r.status_code}'
for path, label in [
    ('/auth/me','auth/me'), ('/games/upcoming','games/upcoming'), ('/games/closed','games/closed'),
    ('/predictions/','predictions'), ('/rankings/overall','rankings/overall'),
    ('/rankings/rounds','rankings/rounds'), ('/players/','players'), ('/news/','news'),
    ('/admin/users','admin/users'), ('/admin/games','admin/games'),
    ('/admin/datetime-override','datetime-override'), ('/teams/','teams'),
]:
    resp = s.get(f'{BASE}{path}')
    status = 'OK' if resp.status_code == 200 else 'FAIL'
    print(f'  [{status}] {resp.status_code} {label}')
    assert resp.status_code == 200, f'{label} returned {resp.status_code}'
s.post(f'{BASE}/auth/logout')
print('All checks passed.')
"
```
Expected: all endpoints return [OK] 200.

### 4. Page accessibility check — requires both servers running
Verify every frontend page loads and the nav links work by hitting the Vite dev server:
```bash
"c:/Users/nsamberger/OneDrive - Amadeus Workplace/zgoogies/2016app/backend/venv/Scripts/python.exe" -c "
import requests, sys
sys.stdout.reconfigure(encoding='utf-8')
BASE = 'http://localhost:5173'
pages = [
    ('/', 'Root redirect'),
    ('/predictions', 'Predictions'),
    ('/rankings', 'Rankings'),
    ('/news', 'News'),
    ('/players', 'Players'),
    ('/account', 'My Account'),
    ('/admin', 'Admin'),
    ('/login', 'Login'),
    ('/register', 'Register'),
    ('/forgot-password', 'Forgot Password'),
]
for path, label in pages:
    r = requests.get(f'{BASE}{path}', timeout=5)
    status = 'OK' if r.status_code == 200 else 'FAIL'
    has_root = '<div id=\"root\">' in r.text
    print(f'  [{status}] {r.status_code} {label} (React root: {\"yes\" if has_root else \"NO\"})')
    assert r.status_code == 200, f'{label} returned {r.status_code}'
    assert has_root, f'{label} missing React root div'
print('All pages accessible.')
"
```
Expected: all pages return 200 and contain the React root div.

### 5. Stop the application
```bash
cd "c:/Users/nsamberger/OneDrive - Amadeus Workplace/zgoogies/2016app" && python stop.py
```

All 5 steps must pass before committing or declaring work done.

## Project context

- Root: `c:\Users\nsamberger\OneDrive - Amadeus Workplace\zgoogies\2016app`
- Backend venv: `backend/venv/Scripts/python.exe`
- Admin credentials: `admin` / `admin123`
- Frontend: http://localhost:5173
- Backend: http://localhost:5000
