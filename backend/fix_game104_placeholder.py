#!/usr/bin/env python3
"""
One-off fix: rename placeholder team "W191" to "W101" for the Final (game 104).

The JSON import had a typo — teamA for game 104 was entered as W191 instead of
W101 (winner of game 101, the first SF). This script renames the team in-place
so all game FK references stay intact.

Run from backend/ directory:
    venv/bin/python fix_game104_placeholder.py

Safe to run multiple times — skips if already fixed.
"""

import sys
import os

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BACKEND_DIR)


def main():
    from app import create_app, db
    from app.models.team import Team
    from app.models.game import Game

    app = create_app('development')
    with app.app_context():
        wrong = Team.query.filter_by(name='W191').first()
        if not wrong:
            already = Team.query.filter_by(name='W101').first()
            if already:
                print('[SKIP] W191 not found; W101 already exists — nothing to do.')
            else:
                print('[WARN] Neither W191 nor W101 found in database.')
            return 0

        # Count how many games reference this team
        affected = Game.query.filter(
            (Game.team_a_id == wrong.id) | (Game.team_b_id == wrong.id)
        ).all()
        print(f'Found team "{wrong.name}" (id={wrong.id}) referenced in {len(affected)} game(s):')
        for g in affected:
            ta = Team.query.get(g.team_a_id)
            tb = Team.query.get(g.team_b_id)
            print(f'  Game {g.id}: {ta.name} vs {tb.name}  stage={g.stage}')

        # Rename W191 → W101
        wrong.name = 'W101'
        db.session.commit()
        print(f'\n[OK] Renamed "W191" -> "W101" (team id={wrong.id})')

    return 0


if __name__ == '__main__':
    sys.exit(main())
