from flask import Blueprint, jsonify
from app.models.team import Team

bp = Blueprint('teams', __name__, url_prefix='/api/teams')


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
