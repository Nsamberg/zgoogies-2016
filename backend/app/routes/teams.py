from flask import Blueprint, jsonify
from flask_login import login_required
from app.models.team import Team
from app.models.app_setting import AppSetting

bp = Blueprint('teams', __name__, url_prefix='/api/teams')

TOURNAMENT_WINNER_KEY = 'tournament_winner_team_id'


@bp.route('/tournament-winner', methods=['GET'])
@login_required
def get_tournament_winner():
    """Return the tournament winner team (if the admin has set one)"""
    team_id = AppSetting.get(TOURNAMENT_WINNER_KEY)
    if not team_id:
        return jsonify({'team': None}), 200
    team = Team.query.get(int(team_id))
    if not team:
        return jsonify({'team': None}), 200
    return jsonify({'team': {'id': team.id, 'name': team.name}}), 200


@bp.route('/', methods=['GET'])
def get_teams():
    """Get all teams for tournament winner selection"""
    teams = Team.query.order_by(Team.name).all()

    return jsonify([{
        'id': t.id,
        'name': t.name,
        'code': t.code,
        'flag_url': t.flag_url
    } for t in teams]), 200
