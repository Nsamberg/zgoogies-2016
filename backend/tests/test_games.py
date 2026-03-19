"""Tests for games endpoints."""
import pytest


class TestUpcomingGames:
    def test_upcoming_requires_auth(self, client):
        r = client.get('/api/games/upcoming')
        assert r.status_code == 401

    def test_upcoming_returns_list(self, admin_client):
        r = admin_client.get('/api/games/upcoming')
        assert r.status_code == 200
        assert isinstance(r.get_json(), list)

    def test_upcoming_game_fields(self, admin_client):
        r = admin_client.get('/api/games/upcoming')
        games = r.get_json()
        if games:
            g = games[0]
            for field in ['id', 'team_a', 'team_b', 'game_date',
                          'stage', 'location', 'competition_round']:
                assert field in g, f"Missing field: {field}"

    def test_upcoming_only_future_games(self, admin_client):
        """All games returned must not be closed for predictions."""
        r = admin_client.get('/api/games/upcoming')
        games = r.get_json()
        # The seeded future game (2026-07-15) should appear
        assert any(g['stage'] == 'Group A' for g in games)
        # The past game (2020-06-10) must NOT appear
        assert not any(g['stage'] == 'Group B' for g in games)


class TestClosedGames:
    def test_closed_requires_auth(self, client):
        r = client.get('/api/games/closed')
        assert r.status_code == 401

    def test_closed_returns_list(self, admin_client):
        r = admin_client.get('/api/games/closed')
        assert r.status_code == 200
        assert isinstance(r.get_json(), list)

    def test_closed_includes_past_games(self, admin_client):
        """Past games should appear in the closed list."""
        r = admin_client.get('/api/games/closed')
        games = r.get_json()
        assert any(g['stage'] == 'Group B' for g in games)
        # The future game must NOT appear in closed
        assert not any(g['stage'] == 'Group A' for g in games)

    def test_closed_game_fields(self, admin_client):
        r = admin_client.get('/api/games/closed')
        games = r.get_json()
        if games:
            g = games[0]
            for field in ['id', 'team_a', 'team_b', 'game_date', 'is_scored']:
                assert field in g, f"Missing field: {field}"
