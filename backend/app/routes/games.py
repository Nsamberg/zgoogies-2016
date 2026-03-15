from flask import Blueprint, request, jsonify
from flask_login import login_required
from app.models.game import Game

bp = Blueprint('games', __name__, url_prefix='/api/games')


@bp.route('/upcoming', methods=['GET'])
@login_required
def get_upcoming_games():
    """Get games where predictions are still open"""
    from datetime import datetime, timedelta
    deadline = datetime.utcnow() + timedelta(hours=2)

    games = Game.query.filter(Game.game_date >= deadline).order_by(Game.game_date).all()

    return jsonify([{
        'id': g.id,
        'team_a': {'id': g.team_a.id, 'name': g.team_a.name},
        'team_b': {'id': g.team_b.id, 'name': g.team_b.name},
        'game_date': g.game_date.isoformat(),
        'location': g.location.city,
        'stage': g.stage,
        'group': g.group,
        'competition_round': {
            'id': g.competition_round.id,
            'name': g.competition_round.name,
            'round_number': g.competition_round.round_number
        } if g.competition_round else None,
        'is_double_points': g.is_double_points(),
        'prediction_deadline': g.get_prediction_deadline().isoformat()
    } for g in games]), 200


@bp.route('/closed', methods=['GET'])
@login_required
def get_closed_games():
    """Get games where predictions are closed"""
    from datetime import datetime, timedelta
    deadline = datetime.utcnow() + timedelta(hours=2)

    games = Game.query.filter(Game.game_date < deadline).order_by(Game.game_date.desc()).all()

    return jsonify([{
        'id': g.id,
        'team_a': {'id': g.team_a.id, 'name': g.team_a.name, 'score': g.team_a_score},
        'team_b': {'id': g.team_b.id, 'name': g.team_b.name, 'score': g.team_b_score},
        'game_date': g.game_date.isoformat(),
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


@bp.route('/<int:game_id>', methods=['GET'])
@login_required
def get_game(game_id):
    """Get details for a specific game"""
    game = Game.query.get_or_404(game_id)

    return jsonify({
        'id': game.id,
        'team_a': {'id': game.team_a.id, 'name': game.team_a.name, 'score': game.team_a_score},
        'team_b': {'id': game.team_b.id, 'name': game.team_b.name, 'score': game.team_b_score},
        'game_date': game.game_date.isoformat(),
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
