#!/usr/bin/env python3
"""
Remove test games from the database.
This script removes games that are not part of the World Cup 2026 tournament.
"""

import sys
from datetime import datetime
from app import create_app, db
from app.models.game import Game


def remove_test_games():
    """Remove test games from database"""
    print("=" * 100)
    print("Remove Test Games")
    print("=" * 100)

    app = create_app('development')

    with app.app_context():
        # Count games before
        games_count_before = db.session.query(Game).count()
        print(f"\nTotal games before: {games_count_before}")

        # World Cup 2026 starts on June 11, 2026
        tournament_start = datetime(2026, 6, 11)

        # Find test games (games before tournament start date)
        test_games = db.session.query(Game).filter(
            Game.game_date < tournament_start
        ).all()

        print(f"\nTest games found: {len(test_games)}")

        if test_games:
            print("\nTest games to be removed:")
            for game in test_games:
                print(f"  - {game.game_date.strftime('%Y-%m-%d %H:%M UTC')}: {game.team_a.name} vs {game.team_b.name}")

            # Remove test games
            for game in test_games:
                db.session.delete(game)

            db.session.commit()
            print(f"\n[OK] Removed {len(test_games)} test games")

        # Count games after
        games_count_after = db.session.query(Game).count()
        print(f"\nTotal games after: {games_count_after}")

        print("\n" + "=" * 100)
        print("[SUCCESS] Test games removed!")
        print("=" * 100)

        return True


if __name__ == '__main__':
    success = remove_test_games()
    sys.exit(0 if success else 1)
