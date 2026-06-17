from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from functools import wraps
import threading
from app import db
from app.models.user import User
from app.models.game import Game
from app.models.team import Team
from app.models.prediction import Prediction
from app.models.prediction_history import PredictionHistory
from app.models.ranking import Ranking
from app.models.ranking_history import RankingHistory
from app.models.news import News
from app.models.app_setting import AppSetting
from app.models.access_log import AccessLog
from app.services.ranking_service import (
    update_rankings_after_game,
    recalculate_rankings_for_round,
    recalculate_overall_rankings,
    award_tournament_winner_bonus
)
from app.services.email_service import send_payment_confirmation_email

bp = Blueprint('admin', __name__, url_prefix='/api/admin')

TOURNAMENT_WINNER_KEY = 'tournament_winner_team_id'


def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated_function


def cachier_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_cachier_or_admin():
            return jsonify({'error': 'Cachier or admin access required'}), 403
        return f(*args, **kwargs)
    return decorated_function


# ---------------------------------------------------------------------------
# Users / Payments
# ---------------------------------------------------------------------------

@bp.route('/users', methods=['GET'])
@login_required
@cachier_required
def get_users():
    """All users with payment status and role info"""
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify([{
        'id': u.id,
        'username': u.username,
        'first_name': u.first_name,
        'surname': u.surname,
        'email': u.email,
        'is_admin': u.is_admin,
        'is_cachier': u.is_cachier,
        'is_player': u.is_player,
        'has_paid': u.has_paid,
        'payment_date': u.payment_date.isoformat() + 'Z' if u.payment_date else None,
        'payment_received_by': u.payment_received_by.username if u.payment_received_by else None,
        'created_at': u.created_at.isoformat() + 'Z'
    } for u in users]), 200


@bp.route('/payment/<int:user_id>', methods=['POST'])
@login_required
@cachier_required
def record_payment(user_id):
    """Mark a user as paid"""
    user = User.query.get_or_404(user_id)
    user.has_paid = True
    user.payment_received_by_id = current_user.id
    user.payment_date = db.func.now()
    log = AccessLog(user_id=current_user.id, action='payment_recorded',
                    page=f'user:{user.username}', ip_address=request.remote_addr)
    db.session.add(log)
    db.session.commit()
    app = current_app._get_current_object()
    threading.Thread(target=send_payment_confirmation_email, args=(app, user.email, user.first_name, user.surname), daemon=True).start()
    return jsonify({'message': 'Payment recorded'}), 200


@bp.route('/payment/<int:user_id>', methods=['DELETE'])
@login_required
@cachier_required
def remove_payment(user_id):
    """Mark a user as unpaid"""
    user = User.query.get_or_404(user_id)
    user.has_paid = False
    user.payment_received_by_id = None
    user.payment_date = None
    log = AccessLog(user_id=current_user.id, action='payment_removed',
                    page=f'user:{user.username}', ip_address=request.remote_addr)
    db.session.add(log)
    db.session.commit()
    return jsonify({'message': 'Payment removed'}), 200


@bp.route('/users/<int:user_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_user(user_id):
    """Permanently delete a user and all associated data"""
    if user_id == current_user.id:
        return jsonify({'error': 'Cannot delete your own account'}), 400

    user = User.query.get_or_404(user_id)

    # Delete associated data in correct order to avoid FK constraint issues
    RankingHistory.query.filter_by(user_id=user_id).delete()
    Ranking.query.filter_by(user_id=user_id).delete()
    PredictionHistory.query.filter_by(user_id=user_id).delete()
    Prediction.query.filter_by(user_id=user_id).delete()

    # Remove references to this user as payment receiver
    User.query.filter_by(payment_received_by_id=user_id).update({'payment_received_by_id': None})

    db.session.delete(user)
    db.session.commit()

    return jsonify({'message': f'User {user.username} deleted'}), 200


@bp.route('/users/<int:user_id>/role', methods=['PUT'])
@login_required
@admin_required
def update_user_role(user_id):
    """Update a user's role"""
    if user_id == current_user.id:
        return jsonify({'error': 'Cannot change your own role'}), 400

    user = User.query.get_or_404(user_id)
    data = request.get_json()

    user.is_admin = data.get('is_admin', user.is_admin)
    user.is_cachier = data.get('is_cachier', user.is_cachier)
    user.is_player = data.get('is_player', user.is_player)
    log = AccessLog(user_id=current_user.id, action='role_changed',
                    page=f'user:{user.username}', ip_address=request.remote_addr)
    db.session.add(log)
    db.session.commit()

    return jsonify({'message': 'Role updated'}), 200


@bp.route('/users/<int:user_id>/email', methods=['PUT'])
@login_required
@admin_required
def update_user_email(user_id):
    """Update a user's email address"""
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    email = (data.get('email') or '').strip().lower()
    if not email:
        return jsonify({'error': 'Email is required'}), 400
    existing = User.query.filter(User.email == email, User.id != user_id).first()
    if existing:
        return jsonify({'error': 'Email already in use by another account'}), 400
    user.email = email
    db.session.commit()
    return jsonify({'message': 'Email updated'}), 200


# ---------------------------------------------------------------------------
# Score Entry
# ---------------------------------------------------------------------------

@bp.route('/games', methods=['GET'])
@login_required
@admin_required
def get_games_for_scoring():
    """All games sorted by date, for score management"""
    games = Game.query.order_by(Game.game_date.asc()).all()
    return jsonify([_game_dict(g) for g in games]), 200


@bp.route('/games/<int:game_id>/teams', methods=['PATCH'])
@login_required
@admin_required
def update_game_teams(game_id):
    """Update the two teams playing in a game (for knockout stage fixtures)"""
    game = Game.query.get_or_404(game_id)
    if game.is_scored:
        return jsonify({'error': 'Cannot change teams on a scored game.'}), 400

    data = request.get_json() or {}
    team_a_id = data.get('team_a_id')
    team_b_id = data.get('team_b_id')

    if not team_a_id or not team_b_id:
        return jsonify({'error': 'team_a_id and team_b_id are required'}), 400
    if team_a_id == team_b_id:
        return jsonify({'error': 'Team A and Team B must be different'}), 400

    team_a = Team.query.get(team_a_id)
    team_b = Team.query.get(team_b_id)
    if not team_a or not team_b:
        return jsonify({'error': 'One or both teams not found'}), 404

    game.team_a_id = team_a_id
    game.team_b_id = team_b_id
    db.session.add(AccessLog(
        user_id=current_user.id,
        action='game_teams_updated',
        page=f'game:{game_id} {team_a.name} vs {team_b.name}',
        ip_address=request.remote_addr,
    ))
    db.session.commit()

    return jsonify(_game_dict(game)), 200


@bp.route('/score/<int:game_id>', methods=['POST'])
@login_required
@admin_required
def enter_score(game_id):
    """Enter actual game score and trigger point + ranking calculation"""
    game = Game.query.get_or_404(game_id)
    data = request.get_json()

    if game.is_scored:
        return jsonify({'error': 'Game already scored. Use rollback first.'}), 400

    if not game.is_prediction_closed():
        return jsonify({'error': 'Cannot enter score: predictions are still open for this game.'}), 400

    game.team_a_score = data['team_a_score']
    game.team_b_score = data['team_b_score']
    game.is_scored = True
    game.scored_at = db.func.now()

    predictions = Prediction.query.filter_by(game_id=game_id).all()
    for prediction in predictions:
        prediction.points = prediction.calculate_points(
            game.team_a_score,
            game.team_b_score,
            game.is_double_points()
        )
        prediction.is_calculated = True

    log = AccessLog(user_id=current_user.id, action='score_entered',
                    page=f'game:{game_id}', ip_address=request.remote_addr)
    db.session.add(log)
    db.session.commit()
    update_rankings_after_game(game)

    return jsonify({'message': 'Score entered and points calculated'}), 200


@bp.route('/score/<int:game_id>', methods=['DELETE'])
@login_required
@admin_required
def rollback_score(game_id):
    """Roll back a game score — resets points and recalculates rankings"""
    game = Game.query.get_or_404(game_id)

    if not game.is_scored:
        return jsonify({'error': 'Game is not scored'}), 400

    round_id = game.competition_round_id

    # Reset game
    game.team_a_score = None
    game.team_b_score = None
    game.is_scored = False
    game.scored_at = None

    # Reset predictions for this game
    Prediction.query.filter_by(game_id=game_id).update({
        'points': None,
        'is_calculated': False
    })

    log = AccessLog(user_id=current_user.id, action='score_rolled_back',
                    page=f'game:{game_id}', ip_address=request.remote_addr)
    db.session.add(log)
    db.session.commit()

    # Recalculate rankings excluding this game
    recalculate_rankings_for_round(round_id)
    recalculate_overall_rankings()

    return jsonify({'message': 'Score rolled back and rankings recalculated'}), 200


# ---------------------------------------------------------------------------
# Tournament Winner
# ---------------------------------------------------------------------------

@bp.route('/tournament-winner', methods=['GET'])
@login_required
@admin_required
def get_tournament_winner():
    """Get the currently set tournament winner (if any)"""
    team_id = AppSetting.get(TOURNAMENT_WINNER_KEY)
    if not team_id:
        return jsonify({'winner': None}), 200

    team = Team.query.get(int(team_id))
    if not team:
        return jsonify({'winner': None}), 200

    return jsonify({'winner': {'id': team.id, 'name': team.name}}), 200


@bp.route('/tournament-winner', methods=['POST'])
@login_required
@admin_required
def set_tournament_winner():
    """Set the tournament winner and award 15-point bonuses"""
    if AppSetting.get(TOURNAMENT_WINNER_KEY):
        return jsonify({'error': 'Tournament winner already set. Use rollback first.'}), 400

    data = request.get_json()
    winner_team_id = data['winner_team_id']

    team = Team.query.get_or_404(winner_team_id)

    AppSetting.set(TOURNAMENT_WINNER_KEY, str(winner_team_id))
    award_tournament_winner_bonus(winner_team_id)

    correct_users = User.query.filter_by(tournament_winner_id=winner_team_id).count()
    return jsonify({
        'message': f'Tournament winner set to {team.name}',
        'correct_predictions': correct_users
    }), 200


@bp.route('/tournament-winner', methods=['DELETE'])
@login_required
@admin_required
def rollback_tournament_winner():
    """Roll back the tournament winner — removes bonus points and recalculates"""
    team_id = AppSetting.get(TOURNAMENT_WINNER_KEY)
    if not team_id:
        return jsonify({'error': 'No tournament winner is currently set'}), 400

    from config import Config
    bonus_points = Config.TOURNAMENT_WINNER_POINTS

    # Subtract bonus from users who predicted correctly
    correct_users = User.query.filter_by(tournament_winner_id=int(team_id)).all()
    for user in correct_users:
        ranking = Ranking.query.filter_by(
            user_id=user.id,
            competition_round_id=None
        ).first()
        if ranking:
            ranking.total_points = max(0, ranking.total_points - bonus_points)

    db.session.commit()
    recalculate_overall_rankings()

    AppSetting.delete(TOURNAMENT_WINNER_KEY)

    return jsonify({'message': 'Tournament winner rolled back'}), 200


# ---------------------------------------------------------------------------
# News management
# ---------------------------------------------------------------------------

@bp.route('/news', methods=['GET'])
@login_required
@cachier_required
def get_news_admin():
    """Get all news articles (for admin management)"""
    news_items = News.query.order_by(News.created_at.desc()).all()
    return jsonify([{
        'id': n.id,
        'title': n.title,
        'content': n.content,
        'image_url': n.image_url,
        'author': n.author.username,
        'created_at': n.created_at.isoformat() + 'Z'
    } for n in news_items]), 200


@bp.route('/news', methods=['POST'])
@login_required
@cachier_required
def create_news():
    """Create a news article"""
    data = request.get_json()
    news_item = News(
        title=data['title'],
        content=data['content'],
        image_url=data.get('image_url') or None,
        author_id=current_user.id
    )
    db.session.add(news_item)
    db.session.commit()
    return jsonify({'message': 'News created', 'id': news_item.id}), 201


@bp.route('/news/<int:news_id>', methods=['PUT'])
@login_required
@cachier_required
def update_news(news_id):
    """Update a news article"""
    news_item = News.query.get_or_404(news_id)
    data = request.get_json()
    news_item.title = data.get('title', news_item.title)
    news_item.content = data.get('content', news_item.content)
    news_item.image_url = data.get('image_url', news_item.image_url) or None
    db.session.commit()
    return jsonify({'message': 'News updated'}), 200


@bp.route('/news/<int:news_id>', methods=['DELETE'])
@login_required
@cachier_required
def delete_news(news_id):
    """Delete a news article"""
    news_item = News.query.get_or_404(news_id)
    db.session.delete(news_item)
    db.session.commit()
    return jsonify({'message': 'News deleted'}), 200


# ---------------------------------------------------------------------------
# Datetime Override (testing tool — all branches)
# ---------------------------------------------------------------------------

@bp.route('/datetime-override', methods=['GET'])
@login_required
def get_datetime_override():
    """Return the current datetime override as a computed simulated ISO time (null if not set)."""
    from datetime import datetime, timedelta
    offset_str = AppSetting.get('datetime_override_offset')
    if offset_str:
        offset_secs = float(offset_str)
        simulated = datetime.utcnow() + timedelta(seconds=offset_secs)
        return jsonify({'override': simulated.isoformat() + 'Z', 'offset_seconds': offset_secs}), 200
    return jsonify({'override': None, 'offset_seconds': None}), 200


@bp.route('/datetime-override', methods=['POST'])
@login_required
@admin_required
def set_datetime_override():
    """Set a dynamic datetime override. The offset (simulated − real) is stored so simulated time
    advances in lockstep with real time."""
    data = request.get_json()
    raw = data.get('datetime', '').strip()
    if not raw:
        return jsonify({'error': 'datetime field required (ISO 8601 UTC)'}), 400

    from datetime import datetime, timedelta
    try:
        dt = datetime.fromisoformat(raw)
    except ValueError:
        return jsonify({'error': 'Invalid datetime format. Use ISO 8601 (e.g. 2026-06-11T16:00:00)'}), 400

    offset = dt - datetime.utcnow()
    offset_secs = offset.total_seconds()
    AppSetting.set('datetime_override_offset', str(offset_secs))
    simulated = datetime.utcnow() + timedelta(seconds=offset_secs)
    return jsonify({
        'message': f'Datetime override set — offset {offset_secs:.0f}s from real time',
        'override': simulated.isoformat() + 'Z',
        'offset_seconds': offset_secs
    }), 200


@bp.route('/datetime-override', methods=['DELETE'])
@login_required
@admin_required
def clear_datetime_override():
    """Clear the datetime override — app reverts to using the real system clock."""
    AppSetting.delete('datetime_override_offset')
    AppSetting.delete('datetime_override')  # clean up legacy key if present
    return jsonify({'message': 'Datetime override cleared — using real system time'}), 200


# ---------------------------------------------------------------------------
# AI daily call limit
# ---------------------------------------------------------------------------

@bp.route('/ai-limit', methods=['GET'])
@login_required
def get_ai_limit():
    """Return the current AI daily call limit per user."""
    limit = AppSetting.get('ai_daily_limit', '50')
    return jsonify({'limit': int(limit)}), 200


@bp.route('/ai-limit', methods=['POST'])
@login_required
@admin_required
def set_ai_limit():
    """Set the AI daily call limit per user (1–1000)."""
    data = request.get_json() or {}
    try:
        limit = int(data.get('limit'))
        if limit < 1 or limit > 1000:
            return jsonify({'error': 'Limit must be between 1 and 1000'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'Limit must be an integer'}), 400
    AppSetting.set('ai_daily_limit', str(limit))
    return jsonify({'message': f'AI daily limit set to {limit}', 'limit': limit}), 200


# ---------------------------------------------------------------------------
# Full reset
# ---------------------------------------------------------------------------

@bp.route('/reset-all', methods=['DELETE'])
@login_required
@admin_required
def reset_all():
    """Wipe all scores, predictions and rankings.
    Requires confirmation token 'RESET ALL' in the request body."""
    data = request.get_json() or {}
    if data.get('confirmation') != 'RESET ALL':
        return jsonify({'error': "Confirmation text must be exactly 'RESET ALL'"}), 400

    # 1. Delete ranking history and rankings
    deleted_rh = RankingHistory.query.delete()
    deleted_r  = Ranking.query.delete()

    # 2. Delete prediction history and predictions
    deleted_ph = PredictionHistory.query.delete()
    deleted_p  = Prediction.query.delete()

    # 3. Reset all game scores
    games = Game.query.all()
    for g in games:
        g.is_scored    = False
        g.team_a_score = None
        g.team_b_score = None
        g.scored_at    = None

    # 4. Clear tournament winner setting
    AppSetting.delete(TOURNAMENT_WINNER_KEY)

    db.session.commit()

    return jsonify({
        'message': 'Full reset completed',
        'deleted': {
            'predictions':        deleted_p,
            'prediction_history': deleted_ph,
            'rankings':           deleted_r,
            'ranking_history':    deleted_rh,
            'games_reset':        len(games),
        }
    }), 200


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------

@bp.route('/audit-log/<int:user_id>', methods=['GET'])
@login_required
@admin_required
def get_user_audit_log(user_id):
    """Get activity log for any user (admin only)."""
    User.query.get_or_404(user_id)
    action_filter = request.args.get('action')
    limit = min(int(request.args.get('limit', 50)), 200)
    offset = int(request.args.get('offset', 0))

    query = AccessLog.query.filter_by(user_id=user_id)
    if action_filter:
        query = query.filter_by(action=action_filter)
    total = query.count()
    logs = query.order_by(AccessLog.created_at.desc()).offset(offset).limit(limit).all()

    return jsonify({
        'logs': [{
            'id': l.id,
            'action': l.action,
            'page': l.page,
            'ip_address': l.ip_address,
            'created_at': l.created_at.isoformat() + 'Z'
        } for l in logs],
        'total': total
    }), 200


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _game_dict(g):
    return {
        'id': g.id,
        'team_a': {'id': g.team_a.id, 'name': g.team_a.name},
        'team_b': {'id': g.team_b.id, 'name': g.team_b.name},
        'game_date': g.game_date.isoformat() + 'Z',
        'location': g.location.name if g.location else '',
        'stage': g.stage,
        'group': g.group,
        'competition_round': {
            'id': g.competition_round.id,
            'name': g.competition_round.name,
            'round_number': g.competition_round.round_number
        },
        'is_scored': g.is_scored,
        'is_prediction_closed': g.is_prediction_closed(),
        'team_a_score': g.team_a_score,
        'team_b_score': g.team_b_score,
        'is_double_points': g.is_double_points(),
        'scored_at': g.scored_at.isoformat() + 'Z' if g.scored_at else None
    }
