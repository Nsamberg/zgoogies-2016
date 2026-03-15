#!/usr/bin/env python3
"""
Import FIFA World Cup 2026 Tournament Games from JSON file.
This script imports games, teams, locations, and competition rounds into the database.
"""

import os
import sys
import json
from datetime import datetime
from app import create_app, db
from app.models.game import Game
from app.models.team import Team
from app.models.location import Location
from app.models.competition_round import CompetitionRound


def get_or_create_team(session, team_name):
    """Get or create a team by name"""
    if not team_name or team_name.strip() == '':
        return None

    # Check if team exists
    team = session.query(Team).filter_by(name=team_name).first()

    if not team:
        # Create team code from name (first 3 letters uppercase)
        code = team_name[:3].upper()

        # Make sure code is unique
        existing_team = session.query(Team).filter_by(code=code).first()
        counter = 1
        while existing_team:
            code = f"{team_name[:2].upper()}{counter}"
            existing_team = session.query(Team).filter_by(code=code).first()
            counter += 1

        team = Team(name=team_name, code=code)
        session.add(team)
        print(f"  [+] Created team: {team_name} ({code})")

    return team


def get_or_create_location(session, stadium, city):
    """Get or create a location by stadium and city"""
    if not stadium or not city:
        return None

    # Check if location exists
    location = session.query(Location).filter_by(
        stadium=stadium,
        city=city
    ).first()

    if not location:
        # Try to determine country from city
        # For World Cup 2026: USA, Canada, or Mexico
        country = 'USA'  # Default

        # Known cities by country
        mexican_cities = ['Mexico City', 'Zapopan', 'Monterrey', 'Guadalajara']
        canadian_cities = ['Toronto', 'Vancouver']

        if city in mexican_cities:
            country = 'Mexico'
        elif city in canadian_cities:
            country = 'Canada'

        location = Location(
            name=f"{stadium}, {city}",
            stadium=stadium,
            city=city,
            country=country
        )
        session.add(location)
        print(f"  [+] Created location: {stadium}, {city}, {country}")

    return location


def get_or_create_competition_round(session, round_number):
    """Get or create a competition round"""
    if not round_number:
        return None

    # Check if competition round exists
    comp_round = session.query(CompetitionRound).filter_by(
        round_number=round_number
    ).first()

    if not comp_round:
        comp_round = CompetitionRound(
            name=f"Round {round_number}",
            round_number=round_number,
            is_current=False
        )
        session.add(comp_round)
        print(f"  [+] Created competition round: Round {round_number}")

    return comp_round


def import_tournament_games(json_file_path):
    """Import tournament games from JSON file"""
    print("=" * 100)
    print("FIFA World Cup 2026 Tournament Import")
    print("=" * 100)

    # Check if file exists
    if not os.path.exists(json_file_path):
        print(f"\n[ERROR] JSON file not found: {json_file_path}")
        return False

    try:
        # Load JSON file
        print(f"\nLoading JSON file: {json_file_path}")
        with open(json_file_path, 'r', encoding='utf-8') as f:
            games_data = json.load(f)

        print(f"[OK] Loaded {len(games_data)} games from JSON\n")

        # Create Flask app context
        app = create_app('development')

        with app.app_context():
            print("Starting import...\n")

            # Track statistics
            stats = {
                'games_created': 0,
                'games_skipped': 0,
                'teams_created': set(),
                'locations_created': set(),
                'rounds_created': set()
            }

            # Process each game
            for idx, game_data in enumerate(games_data, 1):
                print(f"Processing game {idx}/{len(games_data)}...")

                # Extract game data
                team_a_name = game_data.get('teamA', '').strip()
                team_b_name = game_data.get('teamB', '').strip()
                stadium = game_data.get('stadium', '').strip()
                city = game_data.get('city', '').strip()
                stage = game_data.get('stage', '').strip()
                date_time_utc = game_data.get('dateTimeUTC')
                round_number = game_data.get('competitionRound')

                # Validate required fields
                if not team_a_name or not team_b_name:
                    print(f"  [SKIP] Missing team names")
                    stats['games_skipped'] += 1
                    continue

                if not date_time_utc:
                    print(f"  [SKIP] Missing date/time")
                    stats['games_skipped'] += 1
                    continue

                # Parse date
                try:
                    game_date = datetime.fromisoformat(date_time_utc.replace('Z', '+00:00'))
                except Exception as e:
                    print(f"  [SKIP] Invalid date format: {date_time_utc}")
                    stats['games_skipped'] += 1
                    continue

                # Get or create related entities
                team_a = get_or_create_team(db.session, team_a_name)
                team_b = get_or_create_team(db.session, team_b_name)
                location = get_or_create_location(db.session, stadium, city)
                comp_round = get_or_create_competition_round(db.session, round_number)

                if not team_a or not team_b or not location or not comp_round:
                    print(f"  [SKIP] Missing required entities")
                    stats['games_skipped'] += 1
                    continue

                # Track created entities
                if team_a.id is None:
                    stats['teams_created'].add(team_a_name)
                if team_b.id is None:
                    stats['teams_created'].add(team_b_name)
                if location.id is None:
                    stats['locations_created'].add(f"{stadium}, {city}")
                if comp_round.id is None:
                    stats['rounds_created'].add(round_number)

                # Commit to get IDs
                db.session.commit()

                # Check if game already exists
                existing_game = db.session.query(Game).filter_by(
                    team_a_id=team_a.id,
                    team_b_id=team_b.id,
                    game_date=game_date
                ).first()

                if existing_game:
                    print(f"  [EXISTS] {team_a_name} vs {team_b_name}")
                    stats['games_skipped'] += 1
                    continue

                # Extract group from stage (e.g., "Group A" -> "A")
                group = None
                if stage and stage.startswith('Group '):
                    group = stage.replace('Group ', '').strip()

                # Create game
                game = Game(
                    team_a_id=team_a.id,
                    team_b_id=team_b.id,
                    game_date=game_date,
                    location_id=location.id,
                    competition_round_id=comp_round.id,
                    stage=stage,
                    group=group,
                    is_scored=False
                )

                db.session.add(game)
                print(f"  [CREATE] {team_a_name} vs {team_b_name} - {stage} - {game_date.strftime('%Y-%m-%d %H:%M UTC')}")
                stats['games_created'] += 1

            # Final commit
            db.session.commit()

            # Print statistics
            print("\n" + "=" * 100)
            print("Import Summary:")
            print("=" * 100)
            print(f"Games created:     {stats['games_created']}")
            print(f"Games skipped:     {stats['games_skipped']}")
            print(f"Teams created:     {len(stats['teams_created'])}")
            print(f"Locations created: {len(stats['locations_created'])}")
            print(f"Rounds created:    {len(stats['rounds_created'])}")
            print("=" * 100)

            print("\n[SUCCESS] Import completed successfully!")
            return True

    except Exception as e:
        print(f"\n[ERROR] Import failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Main function"""
    # Path to JSON file
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    json_file = os.path.join(project_root, 'config', 'Tournament Games.json')

    success = import_tournament_games(json_file)
    return 0 if success else 1


if __name__ == '__main__':
    sys.exit(main())
