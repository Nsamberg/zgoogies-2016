#!/usr/bin/env python3
"""
Sync game kick-off times in the database with the Tournament Games.json reference file.
Safe to run multiple times — only updates rows where the time has changed.
"""

import os
import sys
import json
from datetime import datetime, timezone

# Resolve paths relative to this file
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
JSON_FILE = os.path.join(PROJECT_ROOT, 'config', 'Tournament Games.json')

sys.path.insert(0, SCRIPT_DIR)

from app import create_app, db
from app.models.game import Game
from app.models.team import Team


def sync():
    print("=" * 80)
    print("Syncing game times from Tournament Games.json")
    print("=" * 80)

    with open(JSON_FILE, encoding='utf-8') as f:
        games_data = json.load(f)

    env = os.environ.get('FLASK_ENV', 'production')
    app = create_app(env)

    with app.app_context():
        updated = 0
        skipped = 0
        not_found = []

        import re
        W_REF = re.compile(r'^W\d+$|^\d[A-Z]$|^[123][A-Z]+$')  # placeholder patterns

        for json_idx, entry in enumerate(games_data):
            team_a_name = entry.get('teamA', '').strip()
            team_b_name = entry.get('teamB', '').strip()
            iso = entry.get('dateTimeUTC', '')

            if not team_a_name or not team_b_name or not iso:
                continue

            new_date = datetime.fromisoformat(iso.replace('Z', '+00:00'))
            # Store as naive UTC (consistent with existing rows)
            new_date_naive = new_date.replace(tzinfo=None)

            team_a = db.session.query(Team).filter_by(name=team_a_name).first()
            team_b = db.session.query(Team).filter_by(name=team_b_name).first()

            game = None

            if team_a and team_b:
                game = db.session.query(Game).filter_by(
                    team_a_id=team_a.id,
                    team_b_id=team_b.id,
                ).first()
                if not game:
                    game = db.session.query(Game).filter_by(
                        team_a_id=team_b.id,
                        team_b_id=team_a.id,
                    ).first()

            display = f"{team_a_name} vs {team_b_name}"

            if not game and (W_REF.match(team_a_name) or W_REF.match(team_b_name)):
                # Knockout placeholder not yet resolved in team table — fall back to
                # JSON insertion order: games are inserted sequentially so
                # game.id == json_idx + 1 (1-indexed position in the JSON array).
                fallback_id = json_idx + 1
                game = db.session.query(Game).get(fallback_id)
                if game:
                    display = f"{team_a_name} vs {team_b_name} [id={fallback_id}, by position]"
                else:
                    not_found.append(display)
                    continue
            elif not game:
                not_found.append(display)
                continue

            if game.game_date == new_date_naive:
                skipped += 1
            else:
                old = game.game_date.strftime('%Y-%m-%d %H:%M') if game.game_date else 'None'
                new = new_date_naive.strftime('%Y-%m-%d %H:%M')
                print(f"  UPDATE #{game.id:3d} {display:50s}  {old} → {new} UTC")
                game.game_date = new_date_naive
                updated += 1

        db.session.commit()

        print(f"\nUpdated : {updated}")
        print(f"Already correct: {skipped}")
        if not_found:
            print(f"Not found in DB ({len(not_found)}):")
            for nf in not_found:
                print(f"  - {nf}")
        print("=" * 80)
        print("Done." if not not_found else "Done (with warnings).")


if __name__ == '__main__':
    sync()
