"""
Verify the Competition Rounds system is set up correctly.
"""
from app import create_app, db
from app.models.competition_round import CompetitionRound
from app.models.game import Game
from sqlalchemy import inspect


def verify_setup():
    """Verify database setup"""
    app = create_app('development')

    with app.app_context():
        print("=== Verifying Competition Rounds Setup ===\n")

        # Check competition rounds
        print("Competition Rounds in Database:")
        rounds = CompetitionRound.query.order_by(CompetitionRound.round_number).all()

        if not rounds:
            print("[ERROR] No competition rounds found!")
            return False

        for comp_round in rounds:
            is_last = " [LAST ROUND - DOUBLE POINTS]" if comp_round.is_last_round() else ""
            print(f"  * {comp_round.name} (Round {comp_round.round_number}){is_last}")

        # Check last round
        last_round = CompetitionRound.get_last_round()
        print(f"\nLast Round Identified: {last_round.name} (Round {last_round.round_number})")

        # Check games
        print("\nGames in Database:")
        games = Game.query.all()

        if not games:
            print("[WARNING] No games found!")
        else:
            for game in games:
                double_pts = " [2X POINTS]" if game.is_double_points() else ""
                comp_round_name = game.competition_round.name if game.competition_round else "N/A"
                stage = game.stage or "N/A"
                print(f"  * Game {game.id}: {comp_round_name} - {stage}{double_pts}")

        # Verify schema
        print("\nDatabase Schema Check:")
        inspector = inspect(db.engine)

        # Check competition_rounds table
        if 'competition_rounds' in inspector.get_table_names():
            columns = {col['name']: col['type'] for col in inspector.get_columns('competition_rounds')}
            print("  * competition_rounds table:")

            required_fields = ['id', 'name', 'round_number', 'start_date', 'end_date', 'is_current', 'created_at']
            for field in required_fields:
                status = "[OK]" if field in columns else "[MISSING]"
                print(f"    - {field}: {status}")

        # Check games table
        if 'games' in inspector.get_table_names():
            columns = {col['name']: col['type'] for col in inspector.get_columns('games')}
            print("  * games table:")

            # is_double_points should NOT exist (it's now a method)
            if 'is_double_points' in columns:
                print("    - is_double_points column: [ERROR] Should not exist (should be a method)")
            else:
                print("    - is_double_points column: [OK] Correctly removed (now a method)")

            if 'competition_round_id' in columns:
                print("    - competition_round_id: [OK]")
            else:
                print("    - competition_round_id: [ERROR] Missing!")

        print("\n[SUCCESS] Setup verification complete!")
        return True


if __name__ == '__main__':
    verify_setup()
