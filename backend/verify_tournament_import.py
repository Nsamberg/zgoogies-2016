#!/usr/bin/env python3
"""
Verify the FIFA World Cup 2026 tournament data import.
"""

import sys
from app import create_app, db
from app.models.game import Game
from app.models.team import Team
from app.models.location import Location
from app.models.competition_round import CompetitionRound


def verify_import():
    """Verify the tournament import"""
    print("=" * 100)
    print("FIFA World Cup 2026 Tournament Import Verification")
    print("=" * 100)

    app = create_app('development')

    with app.app_context():
        # Count records
        games_count = db.session.query(Game).count()
        teams_count = db.session.query(Team).count()
        locations_count = db.session.query(Location).count()
        rounds_count = db.session.query(CompetitionRound).count()

        print(f"\nDatabase Statistics:")
        print(f"  Games:             {games_count}")
        print(f"  Teams:             {teams_count}")
        print(f"  Locations:         {locations_count}")
        print(f"  Competition Rounds: {rounds_count}")

        # Show competition rounds with game counts
        print(f"\nCompetition Rounds:")
        rounds = db.session.query(CompetitionRound).order_by(CompetitionRound.round_number).all()
        for comp_round in rounds:
            game_count = db.session.query(Game).filter_by(competition_round_id=comp_round.id).count()
            print(f"  Round {comp_round.round_number} ({comp_round.name}): {game_count} games")

        # Show sample games
        print(f"\nFirst 5 Games:")
        games = db.session.query(Game).order_by(Game.game_date).limit(5).all()
        for game in games:
            print(f"  {game.game_date.strftime('%Y-%m-%d %H:%M UTC')} - {game.team_a.name} vs {game.team_b.name}")
            print(f"    Stage: {game.stage}, Location: {game.location.stadium}, {game.location.city}")

        # Show last 5 games
        print(f"\nLast 5 Games:")
        games = db.session.query(Game).order_by(Game.game_date.desc()).limit(5).all()
        for game in reversed(games):
            print(f"  {game.game_date.strftime('%Y-%m-%d %H:%M UTC')} - {game.team_a.name} vs {game.team_b.name}")
            print(f"    Stage: {game.stage}, Location: {game.location.stadium}, {game.location.city}")

        print("\n" + "=" * 100)
        print("[SUCCESS] Verification complete!")
        print("=" * 100)

        return True


if __name__ == '__main__':
    success = verify_import()
    sys.exit(0 if success else 1)
