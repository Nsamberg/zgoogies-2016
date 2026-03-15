from flask import Blueprint, jsonify
from flask_login import login_required
from app import db
from app.models.user import User
from app.models.team import Team

bp = Blueprint('players', __name__, url_prefix='/api/players')


@bp.route('/', methods=['GET'])
@login_required
def get_players():
    """Get all players"""
    players = User.query.order_by(User.username).all()

    return jsonify([{
        'id': p.id,
        'username': p.username,
        'first_name': p.first_name,
        'surname': p.surname,
        'has_paid': p.has_paid,
        'timezone': p.timezone
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
