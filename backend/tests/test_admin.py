"""Tests for admin endpoints."""
import pytest
from app import db
from app.models.user import User
from app.models.game import Game
from app.models.app_setting import AppSetting


class TestAdminAccess:
    def test_admin_users_requires_auth(self, client):
        r = client.get('/api/admin/users')
        assert r.status_code == 401

    def test_admin_users_requires_admin_role(self, player_client):
        r = player_client.get('/api/admin/users')
        assert r.status_code == 403

    def test_admin_users_accessible_by_admin(self, admin_client):
        r = admin_client.get('/api/admin/users')
        assert r.status_code == 200

    def test_admin_users_accessible_by_cashier(self, client):
        client.post('/api/auth/login',
                    json={'username': 'cashier1', 'password': 'cash1234', 'captcha_token': 'test'})
        r = client.get('/api/admin/users')
        assert r.status_code == 200
        client.post('/api/auth/logout')


class TestAdminUsers:
    def test_returns_all_users(self, admin_client):
        r = admin_client.get('/api/admin/users')
        users = r.get_json()
        assert isinstance(users, list)
        assert len(users) >= 3  # admin, cashier1, player1

    def test_user_fields(self, admin_client):
        r = admin_client.get('/api/admin/users')
        users = r.get_json()
        u = users[0]
        for field in ['id', 'username', 'email', 'is_admin', 'is_cachier', 'has_paid']:
            assert field in u, f"Missing field: {field}"

    def test_no_passwords_exposed(self, admin_client):
        r = admin_client.get('/api/admin/users')
        for u in r.get_json():
            assert 'password' not in u
            assert 'password_hash' not in u


class TestPaymentManagement:
    def test_mark_paid(self, app, admin_client):
        with app.app_context():
            u = User.query.filter_by(username='player1').first()
            uid = u.id

        r = admin_client.post(f'/api/admin/payment/{uid}')
        assert r.status_code == 200

        # Restore
        with app.app_context():
            u = User.query.get(uid)
            u.has_paid = False
            u.payment_received_by = None
            db.session.commit()

    def test_mark_unpaid(self, app, admin_client):
        with app.app_context():
            u = User.query.filter_by(username='player1').first()
            u.has_paid = True
            db.session.commit()
            uid = u.id

        r = admin_client.delete(f'/api/admin/payment/{uid}')
        assert r.status_code == 200

        with app.app_context():
            u = User.query.get(uid)
            assert u.has_paid is False

    def test_payment_requires_admin_or_cashier(self, player_client, app):
        with app.app_context():
            u = User.query.filter_by(username='player1').first()
            uid = u.id
        r = player_client.post(f'/api/admin/payment/{uid}')
        assert r.status_code == 403


class TestAdminGames:
    def test_get_games(self, admin_client):
        r = admin_client.get('/api/admin/games')
        assert r.status_code == 200
        games = r.get_json()
        assert isinstance(games, list)
        assert len(games) > 0

    def test_game_fields(self, admin_client):
        r = admin_client.get('/api/admin/games')
        g = r.get_json()[0]
        for field in ['id', 'team_a', 'team_b', 'game_date', 'is_scored']:
            assert field in g, f"Missing field: {field}"


class TestScoreEntry:
    def test_enter_score(self, app, admin_client):
        with app.app_context():
            g = Game.query.filter_by(stage='Group B', is_scored=False).first()
            if not g:
                return  # skip if no unscored closed game
            gid = g.id

        r = admin_client.post(f'/api/admin/score/{gid}',
                              json={'team_a_score': 2, 'team_b_score': 1})
        assert r.status_code == 200

        # Rollback
        r2 = admin_client.delete(f'/api/admin/score/{gid}')
        assert r2.status_code == 200

        with app.app_context():
            g = Game.query.get(gid)
            assert g.is_scored is False

    def test_score_requires_admin(self, player_client):
        r = player_client.post('/api/admin/score/1',
                               json={'team_a_score': 1, 'team_b_score': 0})
        assert r.status_code == 403


class TestDatetimeOverride:
    def test_get_override_not_set(self, admin_client):
        r = admin_client.get('/api/admin/datetime-override')
        assert r.status_code == 200
        data = r.get_json()
        assert 'override' in data

    def test_set_override(self, app, admin_client):
        r = admin_client.post('/api/admin/datetime-override',
                              json={'datetime': '2026-06-15T10:00:00'})
        assert r.status_code == 200
        data = r.get_json()
        assert data['override'] is not None

        # Verify get returns it
        r2 = admin_client.get('/api/admin/datetime-override')
        assert r2.get_json()['override'] is not None

        # Cleanup
        admin_client.delete('/api/admin/datetime-override')

    def test_clear_override(self, app, admin_client):
        # Set first
        admin_client.post('/api/admin/datetime-override',
                          json={'datetime': '2026-06-15T10:00:00'})
        # Clear
        r = admin_client.delete('/api/admin/datetime-override')
        assert r.status_code == 200

        r2 = admin_client.get('/api/admin/datetime-override')
        assert r2.get_json()['override'] is None

    def test_override_requires_admin(self, player_client):
        r = player_client.post('/api/admin/datetime-override',
                               json={'datetime': '2026-06-15T10:00:00'})
        assert r.status_code == 403

    def test_invalid_datetime_format(self, admin_client):
        r = admin_client.post('/api/admin/datetime-override',
                              json={'datetime': 'not-a-date'})
        assert r.status_code == 400


class TestTournamentWinner:
    def test_get_winner_initially_none(self, admin_client):
        r = admin_client.get('/api/admin/tournament-winner')
        assert r.status_code == 200
        assert r.get_json()['winner'] is None

    def test_set_winner(self, app, admin_client):
        with app.app_context():
            from app.models.team import Team
            t = Team.query.first()
            tid = t.id

        r = admin_client.post('/api/admin/tournament-winner', json={'winner_team_id': tid})
        assert r.status_code == 200

        # Rollback
        admin_client.delete('/api/admin/tournament-winner')

    def test_winner_requires_admin(self, player_client):
        r = player_client.post('/api/admin/tournament-winner', json={'team_id': 1})
        assert r.status_code == 403
