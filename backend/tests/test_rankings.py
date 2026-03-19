"""Tests for rankings endpoints."""
import pytest


class TestOverallRankings:
    def test_requires_auth(self, client):
        r = client.get('/api/rankings/overall')
        assert r.status_code == 401

    def test_returns_list(self, admin_client):
        r = admin_client.get('/api/rankings/overall')
        assert r.status_code == 200
        assert isinstance(r.get_json(), list)

    def test_entry_fields(self, admin_client):
        r = admin_client.get('/api/rankings/overall')
        entries = r.get_json()
        if entries:
            e = entries[0]
            for field in ['rank', 'username', 'total_points']:
                assert field in e, f"Missing field: {field}"


class TestRankingRounds:
    def test_requires_auth(self, client):
        r = client.get('/api/rankings/rounds')
        assert r.status_code == 401

    def test_returns_list(self, admin_client):
        r = admin_client.get('/api/rankings/rounds')
        assert r.status_code == 200
        data = r.get_json()
        assert isinstance(data, list)

    def test_only_rounds_with_games(self, admin_client):
        """Rounds returned must have at least one game."""
        r = admin_client.get('/api/rankings/rounds')
        rounds = r.get_json()
        for rnd in rounds:
            assert rnd['game_count'] > 0, \
                f"Round {rnd['name']} has no games but was returned"

    def test_round_fields(self, admin_client):
        r = admin_client.get('/api/rankings/rounds')
        rounds = r.get_json()
        if rounds:
            rnd = rounds[0]
            for field in ['id', 'name', 'round_number', 'game_count']:
                assert field in rnd, f"Missing field: {field}"

    def test_round_rankings(self, admin_client):
        r = admin_client.get('/api/rankings/rounds')
        rounds = r.get_json()
        if rounds:
            r2 = admin_client.get(f'/api/rankings/round/{rounds[0]["id"]}')
            assert r2.status_code == 200
            assert isinstance(r2.get_json(), list)
