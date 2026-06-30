#!/usr/bin/env python3
"""
Migration: add winner_team_id column to games table.

Run from backend/ directory:
    venv/bin/python add_winner_team_id.py

Safe to run multiple times — skips if already present.
"""

import os
import sys

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BACKEND_DIR)


def main():
    from app import create_app, db

    app = create_app('development')
    with app.app_context():
        conn = db.engine.raw_connection()
        cursor = conn.cursor()

        cols = [row[1] for row in cursor.execute('PRAGMA table_info(games)').fetchall()]
        if 'winner_team_id' in cols:
            print('[SKIP] winner_team_id column already exists.')
            conn.close()
            return 0

        cursor.execute(
            'ALTER TABLE games ADD COLUMN winner_team_id INTEGER REFERENCES teams(id)'
        )
        conn.commit()
        conn.close()
        print('[OK] Added winner_team_id column to games table.')

    return 0


if __name__ == '__main__':
    sys.exit(main())
