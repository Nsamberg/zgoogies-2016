from flask import Blueprint, jsonify
from flask_login import login_required
from datetime import timedelta
from sqlalchemy import func
from app import db
from app.models.user import User
from app.models.team import Team
from app.models.game import Game
from app.models.prediction import Prediction
from app.utils.datetime_utils import get_current_utc

bp = Blueprint('players', __name__, url_prefix='/api/players')


@bp.route('/staff', methods=['GET'])
@login_required
def get_staff():
    """Get cashiers and admins with contact email for the Rules page"""
    staff = User.query.filter(
        (User.is_cachier == True) | (User.is_admin == True)
    ).order_by(func.lower(User.first_name)).all()

    return jsonify([{
        'first_name': u.first_name,
        'surname': u.surname,
        'email': u.email,
        'is_cachier': u.is_cachier,
        'is_admin': u.is_admin,
    } for u in staff]), 200


@bp.route('/', methods=['GET'])
@login_required
def get_players():
    """Get all players"""
    players = User.query.order_by(func.lower(User.username)).all()

    return jsonify([{
        'id': p.id,
        'username': p.username,
        'first_name': p.first_name,
        'surname': p.surname,
        'has_paid': p.has_paid,
        'timezone': p.timezone,
        'is_player': p.is_player,
        'is_cachier': p.is_cachier,
        'is_admin': p.is_admin,
        'tournament_winner_id': p.tournament_winner_id
    } for p in players]), 200


@bp.route('/<int:user_id>', methods=['GET'])
@login_required
def get_player(user_id):
    """Get player details"""
    player = User.query.get_or_404(user_id)

    return jsonify({
        'id': player.id,
        'username': player.username,
        'first_name': player.first_name,
        'surname': player.surname,
        'has_paid': player.has_paid,
        'tournament_winner_id': player.tournament_winner_id
    }), 200


@bp.route('/<int:user_id>/predictions', methods=['GET'])
@login_required
def get_player_predictions(user_id):
    """Get a player's results for all closed games, including games they didn't predict."""
    player = User.query.get_or_404(user_id)

    deadline = get_current_utc() + timedelta(hours=2)
    closed_games = Game.query.filter(Game.game_date < deadline).order_by(Game.game_date.desc()).all()

    pred_map = {
        p.game_id: p
        for p in Prediction.query.filter_by(user_id=player.id).all()
    }

    result = []
    for game in closed_games:
        pred = pred_map.get(game.id)
        result.append({
            'game_id': game.id,
            'team_a': {'id': game.team_a.id, 'name': game.team_a.name, 'score': game.team_a_score},
            'team_b': {'id': game.team_b.id, 'name': game.team_b.name, 'score': game.team_b_score},
            'game_date': game.game_date.isoformat() + 'Z',
            'location': game.location.city,
            'stage': game.stage,
            'group': game.group,
            'competition_round': {
                'id': game.competition_round.id,
                'name': game.competition_round.name,
            } if game.competition_round else None,
            'is_scored': game.is_scored,
            'is_double_points': game.is_double_points(),
            'prediction': {
                'team_a_score': pred.team_a_score,
                'team_b_score': pred.team_b_score,
                'points': pred.points if game.is_scored else None,
            } if pred else None,
        })

    return jsonify(result), 200


@bp.route('/winner-predictions', methods=['GET'])
@login_required
def get_winner_predictions():
    """Get distribution of tournament winner predictions"""
    # Count predictions per team
    from sqlalchemy import func
    predictions = db.session.query(
        User.tournament_winner_id,
        func.count(User.id).label('count')
    ).filter(User.tournament_winner_id.isnot(None)).group_by(User.tournament_winner_id).all()

    teams = Team.query.all()
    team_map = {t.id: t.name for t in teams}

    return jsonify([{
        'team_id': p[0],
        'team_name': team_map.get(p[0]),
        'count': p[1]
    } for p in predictions]), 200
