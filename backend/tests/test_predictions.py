"""Tests for predictions endpoints."""
import pytest
from app import db
from app.models.game import Game
from app.models.prediction import Prediction


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
