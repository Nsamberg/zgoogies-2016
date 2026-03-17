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

## Project context

- Root: `c:\Users\nsamberger\OneDrive - Amadeus Workplace\zgoogies\2016app`
- Backend venv: `backend/venv/Scripts/python.exe`
- Admin credentials: `admin` / `admin123`
- Frontend: http://localhost:5173
- Backend: http://localhost:5000
