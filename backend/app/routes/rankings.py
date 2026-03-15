from flask import Blueprint, request, jsonify
from flask_login import login_required
from app.models.ranking import Ranking
from app.models.ranking_history import RankingHistory
from app.models.competition_round import CompetitionRound

bp = Blueprint('rankings', __name__, url_prefix='/api/rankings')


@bp.route('/overall', methods=['GET'])
@login_required
def get_overall_ranking():
    """Get overall ranking"""
    rankings = Ranking.query.filter_by(competition_round_id=None).order_by(Ranking.rank).all()

    return jsonify([{
        'rank': r.rank,
        'user': {
            'id': r.user.id,
            'username': r.user.username,
            'first_name': r.user.first_name,
            'surname': r.user.surname
        },
        'total_points': r.total_points,
        'previous_rank': r.previous_rank
    } for r in rankings]), 200


@bp.route('/round/<int:round_id>', methods=['GET'])
@login_required
def get_round_ranking(round_id):
    """Get ranking for a specific round"""
    rankings = Ranking.query.filter_by(competition_round_id=round_id).order_by(Ranking.rank).all()

    return jsonify([{
        'rank': r.rank,
        'user': {
            'id': r.user.id,
            'username': r.user.username,
            'first_name': r.user.first_name,
            'surname': r.user.surname
        },
        'total_points': r.total_points,
        'previous_rank': r.previous_rank
    } for r in rankings]), 200


@bp.route('/history/<int:user_id>', methods=['GET'])
@login_required
def get_ranking_history(user_id):
    """Get ranking history for a user"""
    round_id = request.args.get('round_id', type=int)

    query = RankingHistory.query.filter_by(user_id=user_id)
    if round_id:
        query = query.filter_by(competition_round_id=round_id)
    else:
        query = query.filter_by(competition_round_id=None)

    history = query.order_by(RankingHistory.created_at).all()

    return jsonify([{
        'rank': h.rank,
        'total_points': h.total_points,
        'game_id': h.game_id,
        'created_at': h.created_at.isoformat()
    } for h in history]), 200


@bp.route('/rounds', methods=['GET'])
@login_required
def get_rounds():
    """Get all competition rounds"""
    rounds = CompetitionRound.query.order_by(CompetitionRound.order).all()

    return jsonify([{
        'id': r.id,
        'name': r.name,
        'order': r.order,
        'is_current': r.is_current
    } for r in rounds]), 200
