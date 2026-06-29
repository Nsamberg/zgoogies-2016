from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from datetime import timedelta
from app.models.game import Game
from app.models.prediction import Prediction
from app.utils.datetime_utils import get_current_utc

bp = Blueprint('games', __name__, url_prefix='/api/games')


def _game_numbers():
    """Return a dict mapping game_id → chronological position (1-indexed)."""
    ids = [row.id for row in Game.query.order_by(Game.game_date.asc()).with_entities(Game.id).all()]
    return {gid: i + 1 for i, gid in enumerate(ids)}


@bp.route('/upcoming', methods=['GET'])
@login_required
def get_upcoming_games():
    """Get games where predictions are still open"""
    deadline = get_current_utc() + timedelta(hours=2)

    games = Game.query.filter(Game.game_date >= deadline).order_by(Game.game_date).all()
    numbers = _game_numbers()

    return jsonify([{
        'id': g.id,
        'game_number': numbers.get(g.id),
        'team_a': {'id': g.team_a.id, 'name': g.team_a.name},
        'team_b': {'id': g.team_b.id, 'name': g.team_b.name},
        'game_date': g.game_date.isoformat() + 'Z',
        'location': g.location.city,
        'stage': g.stage,
        'group': g.group,
        'competition_round': {
            'id': g.competition_round.id,
            'name': g.competition_round.name,
            'round_number': g.competition_round.round_number
        } if g.competition_round else None,
        'is_double_points': g.is_double_points(),
        'prediction_deadline': g.get_prediction_deadline().isoformat() + 'Z'
    } for g in games]), 200


@bp.route('/closed', methods=['GET'])
@login_required
def get_closed_games():
    """Get games where predictions are closed"""
    deadline = get_current_utc() + timedelta(hours=2)

    games = Game.query.filter(Game.game_date < deadline).order_by(Game.game_date.desc()).all()
    numbers = _game_numbers()

    return jsonify([{
        'id': g.id,
        'game_number': numbers.get(g.id),
        'team_a': {'id': g.team_a.id, 'name': g.team_a.name, 'score': g.team_a_score},
        'team_b': {'id': g.team_b.id, 'name': g.team_b.name, 'score': g.team_b_score},
        'game_date': g.game_date.isoformat() + 'Z',
        'location': g.location.city,
        'stage': g.stage,
        'group': g.group,
        'competition_round': {
            'id': g.competition_round.id,
            'name': g.competition_round.name,
            'round_number': g.competition_round.round_number
        } if g.competition_round else None,
        'is_scored': g.is_scored,
        'is_double_points': g.is_double_points()
    } for g in games]), 200


@bp.route('/knockout', methods=['GET'])
@login_required
def get_knockout_games():
    """Return all knockout-stage games (group IS NULL) with the current user's predictions."""
    games = Game.query.filter(Game.group.is_(None)).order_by(Game.game_date.asc()).all()

    game_ids = [g.id for g in games]
    preds = (
        Prediction.query
        .filter(Prediction.user_id == current_user.id, Prediction.game_id.in_(game_ids))
        .all()
    ) if game_ids else []
    pred_map = {p.game_id: p for p in preds}

    numbers = _game_numbers()

    return jsonify([{
        'id': g.id,
        'game_number': numbers.get(g.id),
        'stage': g.stage or 'Unknown',
        'team_a': {'id': g.team_a.id, 'name': g.team_a.name, 'score': g.team_a_score},
        'team_b': {'id': g.team_b.id, 'name': g.team_b.name, 'score': g.team_b_score},
        'game_date': g.game_date.isoformat() + 'Z',
        'location': g.location.stadium or g.location.city,
        'is_scored': g.is_scored,
        'is_double_points': g.is_double_points(),
        'prediction': {
            'team_a_score': pred_map[g.id].team_a_score,
            'team_b_score': pred_map[g.id].team_b_score,
            'points': pred_map[g.id].points if g.is_scored else None
        } if g.id in pred_map else None
    } for g in games]), 200


@bp.route('/<int:game_id>', methods=['GET'])
@login_required
def get_game(game_id):
    """Get details for a specific game"""
    game = Game.query.get_or_404(game_id)

    return jsonify({
        'id': game.id,
        'team_a': {'id': game.team_a.id, 'name': game.team_a.name, 'score': game.team_a_score},
        'team_b': {'id': game.team_b.id, 'name': game.team_b.name, 'score': game.team_b_score},
        'game_date': game.game_date.isoformat() + 'Z',
        'location': {
            'city': game.location.city,
            'country': game.location.country,
            'stadium': game.location.stadium
        },
        'stage': game.stage,
        'group': game.group,
        'competition_round': game.competition_round.name,
        'is_scored': game.is_scored,
        'is_double_points': game.is_double_points,
        'is_prediction_closed': game.is_prediction_closed()
    }), 200
