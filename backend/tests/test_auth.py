"""Tests for authentication endpoints."""
import json
import pytest
from app import db
from app.models.user import User


class TestLogin:
    def test_login_success(self, client):
        r = client.post('/api/auth/login',
                        json={'username': 'admin', 'password': 'admin123', 'captcha_token': 'test'})
        assert r.status_code == 200
        data = r.get_json()
        assert data['message'] == 'Login successful'
        assert data['user']['username'] == 'admin'
        assert data['user']['is_admin'] is True
        client.post('/api/auth/logout')

    def test_login_wrong_password(self, client):
        r = client.post('/api/auth/login',
                        json={'username': 'admin', 'password': 'wrongpass', 'captcha_token': 'test'})
        assert r.status_code == 401

    def test_login_unknown_user(self, client):
        r = client.post('/api/auth/login',
                        json={'username': 'nobody', 'password': 'pass', 'captcha_token': 'test'})
        assert r.status_code == 401

    def test_login_missing_fields(self, client):
        r = client.post('/api/auth/login', json={})
        assert r.status_code == 400

    def test_login_player_role(self, client):
        r = client.post('/api/auth/login',
                        json={'username': 'player1', 'password': 'pass1234', 'captcha_token': 'test'})
        assert r.status_code == 200
        data = r.get_json()
        assert data['user']['is_admin'] is False
        client.post('/api/auth/logout')


class TestLogout:
    def test_logout_success(self, admin_client):
        r = admin_client.post('/api/auth/logout')
        assert r.status_code == 200

    def test_logout_unauthenticated(self, client):
        r = client.post('/api/auth/logout')
        # logout endpoint is @login_required — returns 401 when not authenticated
        assert r.status_code == 401


class TestMe:
    def test_me_authenticated(self, admin_client):
        r = admin_client.get('/api/auth/me')
        assert r.status_code == 200
        data = r.get_json()
        assert data['username'] == 'admin'
        assert 'password' not in data
        assert 'password_hash' not in data

    def test_me_unauthenticated(self, client):
        r = client.get('/api/auth/me')
        assert r.status_code == 401

    def test_me_returns_required_fields(self, admin_client):
        r = admin_client.get('/api/auth/me')
        data = r.get_json()
        for field in ['id', 'username', 'email', 'first_name', 'surname',
                      'is_admin', 'is_cachier', 'has_paid', 'timezone']:
            assert field in data, f"Missing field: {field}"


class TestProfile:
    def test_update_profile(self, app, player_client):
        r = player_client.put('/api/auth/profile',
                              json={'first_name': 'Updated', 'surname': 'Name',
                                    'email': 'updated@test.com', 'timezone': 'Europe/Paris'})
        assert r.status_code == 200
        # Restore
        with app.app_context():
            u = User.query.filter_by(username='player1').first()
            u.first_name = 'Player'
            u.surname = 'One'
            u.email = 'player1@test.com'
            u.timezone = 'UTC'
            db.session.commit()

    def test_update_profile_unauthenticated(self, client):
        r = client.put('/api/auth/profile', json={'first_name': 'X'})
        assert r.status_code == 401


class TestChangePassword:
    def test_change_password_success(self, app, player_client):
        r = player_client.put('/api/auth/change-password',
                              json={'current_password': 'pass1234',
                                    'new_password': 'newpass99'})
        assert r.status_code == 200
        # Restore original password
        with app.app_context():
            u = User.query.filter_by(username='player1').first()
            u.set_password('pass1234')
            db.session.commit()

    def test_change_password_wrong_current(self, player_client):
        r = player_client.put('/api/auth/change-password',
                              json={'current_password': 'wrongpass',
                                    'new_password': 'newpass99'})
        assert r.status_code == 400

    def test_change_password_unauthenticated(self, client):
        r = client.put('/api/auth/change-password',
                       json={'current_password': 'x', 'new_password': 'y'})
        assert r.status_code == 401


class TestForgotPassword:
    def test_reset_by_username(self, app, client):
        r = client.post('/api/auth/reset-password',
                        json={'identifier': 'player1'})
        assert r.status_code == 200
        # Restore password — reset endpoint assigns a random one
        with app.app_context():
            from app import db
            u = User.query.filter_by(username='player1').first()
            u.set_password('pass1234')
            db.session.commit()

    def test_reset_by_email(self, app, client):
        r = client.post('/api/auth/reset-password',
                        json={'identifier': 'player1@test.com'})
        assert r.status_code == 200
        # Restore password
        with app.app_context():
            from app import db
            u = User.query.filter_by(username='player1').first()
            u.set_password('pass1234')
            db.session.commit()

    def test_reset_unknown_identifier(self, client):
        r = client.post('/api/auth/reset-password',
                        json={'identifier': 'nobody@nowhere.com'})
        assert r.status_code == 404

    def test_reset_missing_identifier(self, client):
        r = client.post('/api/auth/reset-password', json={})
        assert r.status_code == 400
