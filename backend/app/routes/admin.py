from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from functools import wraps
from app import db
from app.models.user import User
from app.models.game import Game
from app.models.prediction import Prediction
from app.services.ranking_service import update_rankings_after_game
from app.services.email_service import send_payment_confirmation_email

bp = Blueprint('admin', __name__, url_prefix='/api/admin')


def admin_required(f):
    """Decorator to require admin access"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated_function


def cachier_required(f):
    """Decorator to require cachier or admin access"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_cachier_or_admin():
            return jsonify({'error': 'Cachier or admin access required'}), 403
        return f(*args, **kwargs)
    return decorated_function


@bp.route('/payment/<int:user_id>', methods=['POST'])
@login_required
@cachier_required
def record_payment(user_id):
    """Record a user's payment"""
    user = User.query.get_or_404(user_id)

    user.has_paid = True
    user.payment_received_by_id = current_user.id
    user.payment_date = db.func.now()

    db.session.commit()

    # Send confirmation email
    send_payment_confirmation_email(user)

    return jsonify({'message': 'Payment recorded'}), 200


@bp.route('/score/<int:game_id>', methods=['POST'])
@login_required
@admin_required
def enter_score(game_id):
    """Enter actual game score and calculate points"""
    game = Game.query.get_or_404(game_id)
    data = request.get_json()

    game.team_a_score = data['team_a_score']
    game.team_b_score = data['team_b_score']
    game.is_scored = True
    game.scored_at = db.func.now()

    # Calculate points for all predictions
    # Double points automatically applied if game is in last Competition Round
    predictions = Prediction.query.filter_by(game_id=game_id).all()
    for prediction in predictions:
        prediction.points = prediction.calculate_points(
            game.team_a_score,
            game.team_b_score,
            game.is_double_points()  # Method call - checks if in last Competition Round
        )
        prediction.is_calculated = True

    db.session.commit()

    # Update rankings
    update_rankings_after_game(game)

    return jsonify({'message': 'Score entered and points calculated'}), 200


@bp.route('/tournament-winner', methods=['POST'])
@login_required
@admin_required
def set_tournament_winner():
    """Set the tournament winner and award bonus points"""
    data = request.get_json()
    winner_team_id = data['winner_team_id']

    # Find users who predicted correctly
    correct_users = User.query.filter_by(tournament_winner_id=winner_team_id).all()

    # Award bonus points via rankings update
    from app.services.ranking_service import award_tournament_winner_bonus
    award_tournament_winner_bonus(winner_team_id)

    return jsonify({
        'message': 'Tournament winner set',
        'correct_predictions': len(correct_users)
    }), 200


@bp.route('/users', methods=['GET'])
@login_required
@cachier_required
def get_users_payment_status():
    """Get all users with payment status (for cachiers and admins)"""
    users = User.query.all()

    return jsonify([{
        'id': u.id,
        'username': u.username,
        'first_name': u.first_name,
        'surname': u.surname,
        'email': u.email,
        'has_paid': u.has_paid,
        'payment_date': u.payment_date.isoformat() if u.payment_date else None
    } for u in users]), 200
