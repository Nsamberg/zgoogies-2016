#!/usr/bin/env python3
"""
Test cases for FIFA World Cup 2026 tournament data import.
Based on verify_tournament_import.py
"""

import unittest
from datetime import datetime
from app import create_app, db
from app.models.game import Game
from app.models.team import Team
from app.models.location import Location
from app.models.competition_round import CompetitionRound


class TournamentImportTestCase(unittest.TestCase):
    """Test cases for tournament import verification"""

    @classmethod
    def setUpClass(cls):
        """Set up test fixtures once for all tests"""
        cls.app = create_app('development')
        cls.app_context = cls.app.app_context()
        cls.app_context.push()

    @classmethod
    def tearDownClass(cls):
        """Clean up after all tests"""
        cls.app_context.pop()

    def test_total_games_count(self):
        """Test that exactly 104 games were imported"""
        games_count = db.session.query(Game).count()
        self.assertEqual(games_count, 104, f"Expected 104 games, but found {games_count}")

    def test_teams_created(self):
        """Test that teams were created"""
        teams_count = db.session.query(Team).count()
        self.assertGreater(teams_count, 0, "No teams were created")
        # World Cup should have at least 48 teams (32 qualified + placeholders)
        self.assertGreaterEqual(teams_count, 48, f"Expected at least 48 teams, but found {teams_count}")

    def test_locations_created(self):
        """Test that locations were created"""
        locations_count = db.session.query(Location).count()
        self.assertGreater(locations_count, 0, "No locations were created")
        # World Cup 2026 has multiple host cities
        self.assertGreaterEqual(locations_count, 10, f"Expected at least 10 locations, but found {locations_count}")

    def test_competition_rounds_count(self):
        """Test that 3 competition rounds were created"""
        rounds_count = db.session.query(CompetitionRound).count()
        self.assertGreaterEqual(rounds_count, 3, f"Expected at least 3 competition rounds, but found {rounds_count}")

    def test_round_1_games_count(self):
        """Test that Round 1 has exactly 36 games"""
        round_1 = db.session.query(CompetitionRound).filter_by(round_number=1).first()
        self.assertIsNotNone(round_1, "Round 1 not found")

        games_count = db.session.query(Game).filter_by(competition_round_id=round_1.id).count()
        self.assertEqual(games_count, 36, f"Round 1 should have 36 games, but has {games_count}")

    def test_round_2_games_count(self):
        """Test that Round 2 has exactly 36 games"""
        round_2 = db.session.query(CompetitionRound).filter_by(round_number=2).first()
        self.assertIsNotNone(round_2, "Round 2 not found")

        games_count = db.session.query(Game).filter_by(competition_round_id=round_2.id).count()
        self.assertEqual(games_count, 36, f"Round 2 should have 36 games, but has {games_count}")

    def test_round_3_games_count(self):
        """Test that Round 3 has exactly 32 games"""
        round_3 = db.session.query(CompetitionRound).filter_by(round_number=3).first()
        self.assertIsNotNone(round_3, "Round 3 not found")

        games_count = db.session.query(Game).filter_by(competition_round_id=round_3.id).count()
        self.assertEqual(games_count, 32, f"Round 3 should have 32 games, but has {games_count}")

    def test_first_game_details(self):
        """Test that the first game is Mexico vs South Africa"""
        first_game = db.session.query(Game).order_by(Game.game_date).first()
        self.assertIsNotNone(first_game, "No games found")

        self.assertEqual(first_game.team_a.name, "Mexico", "First game Team A should be Mexico")
        self.assertEqual(first_game.team_b.name, "South Africa", "First game Team B should be South Africa")
        self.assertEqual(first_game.stage, "Group A", "First game should be in Group A")

    def test_first_game_date(self):
        """Test that the first game is on June 11, 2026"""
        first_game = db.session.query(Game).order_by(Game.game_date).first()
        self.assertIsNotNone(first_game, "No games found")

        expected_date = datetime(2026, 6, 11)
        self.assertEqual(first_game.game_date.year, expected_date.year)
        self.assertEqual(first_game.game_date.month, expected_date.month)
        self.assertEqual(first_game.game_date.day, expected_date.day)

    def test_final_game_details(self):
        """Test that the final game exists"""
        final_game = db.session.query(Game).filter_by(stage="Final").first()
        self.assertIsNotNone(final_game, "Final game not found")

        # Final should be on July 19, 2026
        expected_date = datetime(2026, 7, 19)
        self.assertEqual(final_game.game_date.year, expected_date.year)
        self.assertEqual(final_game.game_date.month, expected_date.month)
        self.assertEqual(final_game.game_date.day, expected_date.day)

    def test_final_game_location(self):
        """Test that the final is at MetLife Stadium"""
        final_game = db.session.query(Game).filter_by(stage="Final").first()
        self.assertIsNotNone(final_game, "Final game not found")

        self.assertEqual(final_game.location.stadium, "MetLife Stadium", "Final should be at MetLife Stadium")
        self.assertEqual(final_game.location.city, "East Rutherford", "Final should be in East Rutherford")

    def test_all_games_have_teams(self):
        """Test that all games have both teams assigned"""
        games_without_teams = db.session.query(Game).filter(
            (Game.team_a_id == None) | (Game.team_b_id == None)
        ).count()
        self.assertEqual(games_without_teams, 0, f"Found {games_without_teams} games without teams")

    def test_all_games_have_location(self):
        """Test that all games have a location assigned"""
        games_without_location = db.session.query(Game).filter(Game.location_id == None).count()
        self.assertEqual(games_without_location, 0, f"Found {games_without_location} games without location")

    def test_all_games_have_competition_round(self):
        """Test that all games have a competition round assigned"""
        games_without_round = db.session.query(Game).filter(Game.competition_round_id == None).count()
        self.assertEqual(games_without_round, 0, f"Found {games_without_round} games without competition round")

    def test_all_games_have_date(self):
        """Test that all games have a date assigned"""
        games_without_date = db.session.query(Game).filter(Game.game_date == None).count()
        self.assertEqual(games_without_date, 0, f"Found {games_without_date} games without date")

    def test_no_duplicate_games(self):
        """Test that there are no duplicate games"""
        games = db.session.query(Game).all()
        game_signatures = set()
        duplicates = []

        for game in games:
            signature = (game.team_a_id, game.team_b_id, game.game_date)
            if signature in game_signatures:
                duplicates.append(f"{game.team_a.name} vs {game.team_b.name} on {game.game_date}")
            game_signatures.add(signature)

        self.assertEqual(len(duplicates), 0, f"Found duplicate games: {duplicates}")

    def test_tournament_date_range(self):
        """Test that all games are within the tournament date range"""
        first_game = db.session.query(Game).order_by(Game.game_date).first()
        last_game = db.session.query(Game).order_by(Game.game_date.desc()).first()

        # Tournament should start on or after June 11, 2026
        self.assertGreaterEqual(
            first_game.game_date,
            datetime(2026, 6, 11),
            "First game should be on or after June 11, 2026"
        )

        # Tournament should end on or before July 31, 2026
        self.assertLessEqual(
            last_game.game_date,
            datetime(2026, 7, 31),
            "Last game should be on or before July 31, 2026"
        )

    def test_group_stages_exist(self):
        """Test that group stage games exist"""
        group_games = db.session.query(Game).filter(Game.stage.like("Group%")).count()
        self.assertGreater(group_games, 0, "No group stage games found")
        # World Cup 2026 has 48 teams in 12 groups, so 72 group stage games
        self.assertGreaterEqual(group_games, 36, f"Expected at least 36 group games, found {group_games}")

    def test_knockout_stages_exist(self):
        """Test that knockout stage games exist"""
        knockout_stages = ["Round of 32", "Round of 16", "Quarterfinals", "Semifinals", "Final"]

        for stage in knockout_stages:
            stage_games = db.session.query(Game).filter(Game.stage.like(f"%{stage}%")).count()
            self.assertGreater(
                stage_games, 0,
                f"No games found for {stage}"
            )

    def test_specific_teams_exist(self):
        """Test that specific teams exist in the database"""
        expected_teams = ["Mexico", "United States", "Canada", "Brazil", "Argentina"]

        for team_name in expected_teams:
            team = db.session.query(Team).filter_by(name=team_name).first()
            self.assertIsNotNone(team, f"Team {team_name} not found in database")

    def test_specific_locations_exist(self):
        """Test that specific stadiums exist in the database"""
        expected_stadiums = ["MetLife Stadium", "Estadio Azteca", "SoFi Stadium"]

        for stadium_name in expected_stadiums:
            location = db.session.query(Location).filter_by(stadium=stadium_name).first()
            self.assertIsNotNone(location, f"Stadium {stadium_name} not found in database")

    def test_games_not_scored_yet(self):
        """Test that no games have been scored yet (is_scored = False)"""
        scored_games = db.session.query(Game).filter_by(is_scored=True).count()
        self.assertEqual(scored_games, 0, f"Found {scored_games} games that are already scored")

    def test_games_have_no_scores(self):
        """Test that no games have scores yet (should be NULL)"""
        games_with_scores = db.session.query(Game).filter(
            (Game.team_a_score != None) | (Game.team_b_score != None)
        ).count()
        self.assertEqual(games_with_scores, 0, f"Found {games_with_scores} games with scores")


def suite():
    """Create test suite"""
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TournamentImportTestCase))
    return suite


if __name__ == '__main__':
    unittest.main()
