"""Tests for predictions endpoints."""
import pytest
from app import db
from app.models.game import Game
from app.models.prediction import Prediction
from app.models.user import User


def _get_open_game_id(app):
    with app.app_context():
        g = Game.query.filter_by(stage='Group A').first()
        return g.id if g else None


def _get_closed_game_id(app):
    with app.app_context():
        g = Game.query.filter_by(stage='Group B').first()
        return g.id if g else None


class TestGetPredictions:
    def test_requires_auth(self, client):
        r = client.get('/api/predictions/')
        assert r.status_code == 401

    def test_returns_list(self, player_client):
        r = player_client.get('/api/predictions/')
        assert r.status_code == 200
        assert isinstance(r.get_json(), list)


class TestSubmitPrediction:
    def test_predict_open_game(self, app, player_client):
        game_id = _get_open_game_id(app)
        assert game_id is not None, "Need an open game"

        r = player_client.post('/api/predictions/',
                               json={'game_id': game_id,
                                     'team_a_score': 2,
                                     'team_b_score': 1})
        assert r.status_code in (200, 201)

        # Cleanup
        with app.app_context():
            Prediction.query.filter_by(game_id=game_id).delete()
            db.session.commit()

    def test_cannot_predict_closed_game(self, app, player_client):
        game_id = _get_closed_game_id(app)
        assert game_id is not None, "Need a closed game"

        r = player_client.post('/api/predictions/',
                               json={'game_id': game_id,
                                     'team_a_score': 1,
                                     'team_b_score': 0})
        assert r.status_code == 400

    def test_predict_requires_auth(self, client):
        r = client.post('/api/predictions/', json={'game_id': 1,
                                                    'team_a_score': 1,
                                                    'team_b_score': 0})
        assert r.status_code == 401

    def test_predict_missing_fields(self, player_client):
        r = player_client.post('/api/predictions/', json={'game_id': 1})
        assert r.status_code == 400

    def test_predict_negative_score_rejected(self, app, player_client):
        game_id = _get_open_game_id(app)
        r = player_client.post('/api/predictions/',
                               json={'game_id': game_id, 'team_a_score': -1, 'team_b_score': 0})
        assert r.status_code == 400

    def test_predict_float_score_rejected(self, app, player_client):
        game_id = _get_open_game_id(app)
        r = player_client.post('/api/predictions/',
                               json={'game_id': game_id, 'team_a_score': 1.5, 'team_b_score': 0})
        assert r.status_code == 400

    def test_predict_string_score_rejected(self, app, player_client):
        game_id = _get_open_game_id(app)
        r = player_client.post('/api/predictions/',
                               json={'game_id': game_id, 'team_a_score': 'two', 'team_b_score': 0})
        assert r.status_code == 400

    def test_predict_unreasonably_large_score_rejected(self, app, player_client):
        game_id = _get_open_game_id(app)
        r = player_client.post('/api/predictions/',
                               json={'game_id': game_id, 'team_a_score': 99, 'team_b_score': 0})
        assert r.status_code == 400

    def test_cannot_inject_another_users_prediction(self, app, player_client):
        """A user cannot submit a prediction on behalf of another user.
        The user_id is always taken from the authenticated session, not the request body.
        Sending a user_id in the body must be silently ignored."""
        game_id = _get_open_game_id(app)
        assert game_id is not None

        # Get admin's ID to attempt impersonation
        with app.app_context():
            admin = User.query.filter_by(username='admin').first()
            admin_id = admin.id
            player = User.query.filter_by(username='player1').first()
            player_id = player.id

        # Submit prediction as player1, but inject admin's user_id in the body
        r = player_client.post('/api/predictions/',
                               json={'game_id': game_id,
                                     'user_id': admin_id,   # injection attempt
                                     'team_a_score': 3,
                                     'team_b_score': 1})
        assert r.status_code in (200, 201), f"Expected success, got {r.status_code}: {r.get_json()}"

        # Verify the prediction was saved under player1, NOT admin
        with app.app_context():
            from app.models.prediction import Prediction as Pred
            from app import db
            p = Pred.query.filter_by(game_id=game_id).first()
            assert p is not None
            assert p.user_id == player_id, "Prediction must belong to the authenticated user"
            assert p.user_id != admin_id, "Injection: prediction must NOT be saved under admin"
            # Cleanup
            Pred.query.filter_by(game_id=game_id).delete()
            db.session.commit()

    def test_predict_and_update(self, app, player_client):
        game_id = _get_open_game_id(app)
        assert game_id is not None

        # Create
        r1 = player_client.post('/api/predictions/',
                                 json={'game_id': game_id,
                                       'team_a_score': 0,
                                       'team_b_score': 0})
        assert r1.status_code in (200, 201)

        # Update same game
        r2 = player_client.post('/api/predictions/',
                                 json={'game_id': game_id,
                                       'team_a_score': 3,
                                       'team_b_score': 1})
        assert r2.status_code in (200, 201)

        # Cleanup
        with app.app_context():
            Prediction.query.filter_by(game_id=game_id).delete()
            db.session.commit()
