#!/usr/bin/env python3
"""
Fix: update game date for matchNumber=89 (Brazil vs Norway, R16).

The game was incorrectly set to 2026-07-04 21:00 UTC; the correct
kickoff is 2026-07-05 20:00 UTC.

Identifies the game by its current wrong datetime so it is safe to run
multiple times — skips if already corrected.

Run from backend/ directory:
    venv/bin/python fix_game91_date.py
"""

import sys
import os
from datetime import datetime, timezone

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BACKEND_DIR)

OLD_DATE = datetime(2026, 7, 4, 21, 0, 0, tzinfo=timezone.utc)
NEW_DATE = datetime(2026, 7, 5, 20, 0, 0, tzinfo=timezone.utc)


def main():
    from app import create_app, db
    from app.models.game import Game

    app = create_app('development')
    with app.app_context():
        # Find by the incorrect date — avoids hard-coding an ID
        game = Game.query.filter_by(game_date=OLD_DATE.replace(tzinfo=None)).first()
        if not game:
            # Try without timezone info (SQLite stores naive datetimes)
            game = Game.query.filter(
                Game.game_date == OLD_DATE.replace(tzinfo=None)
            ).first()

        if not game:
            already = Game.query.filter(
                Game.game_date == NEW_DATE.replace(tzinfo=None)
            ).filter(
                Game.team_a.has(name='Brazil') | Game.team_b.has(name='Brazil')
            ).first()
            if already:
                print('[SKIP] Game already has the correct date (2026-07-05 20:00 UTC).')
            else:
                print('[WARN] Game not found at 2026-07-04 21:00 UTC — check manually.')
            return 0

        ta = game.team_a.name
        tb = game.team_b.name
        print(f'Found game id={game.id}: {ta} vs {tb} at {game.game_date} UTC')
        game.game_date = NEW_DATE.replace(tzinfo=None)
        db.session.commit()
        print(f'[OK] Updated to {NEW_DATE} UTC')

    return 0


if __name__ == '__main__':
    sys.exit(main())
