"""Tests for players endpoints."""
import pytest
from app.models.user import User


class TestPlayersList:
    def test_requires_auth(self, client):
        r = client.get('/api/players/')
        assert r.status_code == 401

    def test_returns_list(self, player_client):
        r = player_client.get('/api/players/')
        assert r.status_code == 200
        assert isinstance(r.get_json(), list)

    def test_player_fields(self, player_client):
        r = player_client.get('/api/players/')
        players = r.get_json()
        assert len(players) > 0
        p = players[0]
        for field in ['id', 'username', 'first_name', 'surname']:
            assert field in p, f"Missing field: {field}"

    def test_no_passwords_exposed(self, player_client):
        r = player_client.get('/api/players/')
        players = r.get_json()
        for p in players:
            assert 'password' not in p
            assert 'password_hash' not in p

    def test_players_sorted_by_username(self, player_client):
        r = player_client.get('/api/players/')
        players = r.get_json()
        usernames = [p['username'].lower() for p in players]
        assert usernames == sorted(usernames), "Players should be sorted alphabetically"

    def test_role_fields_present(self, player_client):
        r = player_client.get('/api/players/')
        players = r.get_json()
        for p in players:
            assert 'is_admin' in p
            assert 'is_cachier' in p


class TestPlayerPredictions:
    def test_player_predictions_requires_auth(self, client, app):
        with app.app_context():
            u = User.query.filter_by(username='player1').first()
            uid = u.id
        r = client.get(f'/api/players/{uid}/predictions')
        assert r.status_code == 401

    def test_player_predictions_returns_list(self, admin_client, app):
        with app.app_context():
            u = User.query.filter_by(username='player1').first()
            uid = u.id
        r = admin_client.get(f'/api/players/{uid}/predictions')
        assert r.status_code == 200
        assert isinstance(r.get_json(), list)

    def test_unknown_player_returns_404(self, admin_client):
        r = admin_client.get('/api/players/99999/predictions')
        assert r.status_code == 404
