#!/usr/bin/env python3
"""
Migration script: rename 6 group-stage placeholder teams to their confirmed names.

Placeholders created at initial import (UEFA A/B/C/D, FIFA 1/2) are renamed
in-place. Games reference teams by FK so no game rows need updating.
Also patches config/Tournament Games.json to stay in sync.

Run from backend/ directory:
    venv/bin/python rename_placeholder_teams.py

Safe to run multiple times — skips teams already renamed.
"""

import os
import sys
import json

# placeholder name -> (confirmed name, 3-letter code)
RENAMES = {
    'UEFA A': ('Bosnia & Herzegovina', 'BIH'),
    'UEFA B': ('Sweden',               'SWE'),
    'UEFA C': ('Turkey',               'TUR'),
    'UEFA D': ('Czech Republic',       'CZE'),
    'FIFA 1': ('DR Congo',             'DRC'),
    'FIFA 2': ('Iraq',                 'IRQ'),
}

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
JSON_PATH = os.path.join(PROJECT_ROOT, 'config', 'Tournament Games.json')


def rename_in_database():
    from app import create_app, db
    from app.models.team import Team
    from app.models.game import Game

    app = create_app('development')
    with app.app_context():
        print('\n=== DATABASE RENAME ===')
        renamed = 0
        skipped = 0

        for old_name, (new_name, new_code) in RENAMES.items():
            team = Team.query.filter_by(name=old_name).first()

            if not team:
                # Check if already renamed
                already = Team.query.filter_by(name=new_name).first()
                if already:
                    print(f'  [SKIP] "{old_name}" already renamed to "{new_name}" (id={already.id})')
                else:
                    print(f'  [WARN] "{old_name}" not found in database — skipping')
                skipped += 1
                continue

            # Count affected games for the summary
            games_count = (
                Game.query.filter(
                    (Game.team_a_id == team.id) | (Game.team_b_id == team.id)
                ).count()
            )

            # Check for code collision
            code_conflict = Team.query.filter_by(code=new_code).first()
            if code_conflict and code_conflict.id != team.id:
                print(f'  [ERROR] Code "{new_code}" already used by "{code_conflict.name}" — fix manually')
                continue

            team.name = new_name
            team.code = new_code
            db.session.commit()
            print(f'  [OK] "{old_name}" -> "{new_name}" ({new_code})  [{games_count} games]')
            renamed += 1

        print(f'\nDatabase: {renamed} renamed, {skipped} skipped')
        return renamed


def rename_in_json():
    print('\n=== JSON FILE UPDATE ===')
    print(f'  Path: {JSON_PATH}')

    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        games = json.load(f)

    changes = 0
    for game in games:
        for field in ('teamA', 'teamB'):
            old = game[field]
            if old in RENAMES:
                game[field] = RENAMES[old][0]
                changes += 1

    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(games, f, indent=2, ensure_ascii=False)
        f.write('\n')

    print(f'  [OK] {changes} team references updated across {len(games)} games')
    return changes


def verify(app):
    from app.models.team import Team
    from app.models.game import Game

    print('\n=== VERIFICATION ===')
    with app.app_context():
        # Confirm no old placeholders remain for the 6 group-stage slots
        remaining = Team.query.filter(
            Team.name.in_(list(RENAMES.keys()))
        ).all()
        if remaining:
            print(f'  [WARN] Still found placeholder teams: {[t.name for t in remaining]}')
        else:
            print('  [OK] No group-stage placeholder teams remain in DB')

        # Confirm new teams are present
        new_names = [v[0] for v in RENAMES.values()]
        found = Team.query.filter(Team.name.in_(new_names)).all()
        for t in sorted(found, key=lambda x: x.name):
            games_count = Game.query.filter(
                (Game.team_a_id == t.id) | (Game.team_b_id == t.id)
            ).count()
            print(f'  {t.name:30} ({t.code})  id={t.id}  games={games_count}')


def main():
    print('=' * 60)
    print('FIFA World Cup 2026 — Placeholder Team Rename')
    print('=' * 60)

    renamed_db = rename_in_database()
    renamed_json = rename_in_json()

    # Re-import app here so verify() has a live context
    from app import create_app
    app = create_app('development')
    with app.app_context():
        verify(app)

    print('\n' + '=' * 60)
    print(f'Done. DB renames: {renamed_db}  |  JSON refs updated: {renamed_json}')
    print('=' * 60)
    print('\nProduction: SSH to server, git pull, then run:')
    print('  cd /home/deploy/zgoogies/backend')
    print('  venv/bin/python rename_placeholder_teams.py')
    print('(No service restart required — SQLite reads updated rows immediately)')


if __name__ == '__main__':
    sys.exit(main())
