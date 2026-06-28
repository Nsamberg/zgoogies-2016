from datetime import timedelta
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app import db
from app.models.prediction import Prediction
from app.models.prediction_history import PredictionHistory
from app.models.game import Game
from app.models.user import User
from app.models.access_log import AccessLog
from app.utils.datetime_utils import get_current_utc

bp = Blueprint('predictions', __name__, url_prefix='/api/predictions')


@bp.route('/', methods=['GET'])
@login_required
def get_predictions():
    """Get user's predictions"""
    predictions = Prediction.query.filter_by(user_id=current_user.id).all()
    return jsonify([{
        'id': p.id,
        'game_id': p.game_id,
        'team_a_score': p.team_a_score,
        'team_b_score': p.team_b_score,
        'points': p.points
    } for p in predictions]), 200


@bp.route('/', methods=['POST'])
@login_required
def create_prediction():
    """Create or update a prediction"""
    data = request.get_json() or {}

    if not data.get('game_id') or data.get('team_a_score') is None or data.get('team_b_score') is None:
        return jsonify({'error': 'game_id, team_a_score and team_b_score are required'}), 400

    # Validate scores are non-negative integers (reject floats, strings, negatives)
    try:
        score_a = int(data['team_a_score'])
        score_b = int(data['team_b_score'])
        if score_a != data['team_a_score'] or score_b != data['team_b_score']:
            raise ValueError('must be exact integers')
    except (ValueError, TypeError):
        return jsonify({'error': 'Scores must be non-negative integers'}), 400
    if score_a < 0 or score_b < 0:
        return jsonify({'error': 'Scores cannot be negative'}), 400
    if score_a > 50 or score_b > 50:
        return jsonify({'error': 'Score value is unreasonably large'}), 400

    if not current_user.can_predict():
        return jsonify({'error': 'Payment required to make predictions'}), 403

    game = Game.query.get(data['game_id'])
    if not game:
        return jsonify({'error': 'Game not found'}), 404

    if game.is_prediction_closed():
        return jsonify({'error': 'Predictions are closed for this game'}), 400

    # Check if prediction exists
    prediction = Prediction.query.filter_by(
        user_id=current_user.id,
        game_id=data['game_id']
    ).first()

    action = 'E' if prediction else 'N'

    if prediction:
        old_score = f'{prediction.team_a_score}-{prediction.team_b_score}'
        prediction.team_a_score = score_a
        prediction.team_b_score = score_b
        log_page = f'game:{data["game_id"]} {old_score}->{score_a}-{score_b}'
    else:
        prediction = Prediction(
            user_id=current_user.id,
            game_id=data['game_id'],
            team_a_score=score_a,
            team_b_score=score_b
        )
        db.session.add(prediction)
        log_page = f'game:{data["game_id"]} new:{score_a}-{score_b}'

    # Log in history
    history = PredictionHistory(
        user_id=current_user.id,
        game_id=data['game_id'],
        team_a_score=score_a,
        team_b_score=score_b,
        action=action
    )
    db.session.add(history)
    log = AccessLog(user_id=current_user.id, action='prediction_submitted',
                    page=log_page, ip_address=request.remote_addr)
    db.session.add(log)
    db.session.commit()

    return jsonify({'message': 'Prediction saved', 'id': prediction.id}), 201


@bp.route('/next-closed', methods=['GET'])
@login_required
def get_next_closed():
    """Return the earliest closed-but-unscored game and every player's prediction for it."""
    now = get_current_utc()
    game = Game.query.filter(
        Game.game_date <= now + timedelta(hours=2),
        Game.is_scored == False
    ).order_by(Game.game_date.asc()).first()

    if not game:
        return jsonify(None), 200

    predictions = Prediction.query.filter_by(game_id=game.id).all()
    return jsonify({
        'game': {
            'id': game.id,
            'team_a': game.team_a.name,
            'team_a_code': game.team_a.code,
            'team_b': game.team_b.name,
            'team_b_code': game.team_b.code,
        },
        'predictions': {
            str(p.user_id): {
                'team_a_score': p.team_a_score,
                'team_b_score': p.team_b_score,
            } for p in predictions
        }
    }), 200


@bp.route('/<int:game_id>', methods=['GET'])
@login_required
def get_game_predictions(game_id):
    """Get all predictions for a specific game (only after predictions close)"""
    game = Game.query.get_or_404(game_id)

    if not game.is_prediction_closed():
        return jsonify({'error': 'Predictions are still open'}), 403

    predictions = Prediction.query.filter_by(game_id=game_id).all()
    pred_user_ids = {p.user_id for p in predictions}

    paid_users = User.query.filter_by(has_paid=True).all()
    non_predictors = [
        {'user_id': u.id, 'username': u.username}
        for u in paid_users
        if u.id not in pred_user_ids
    ]

    return jsonify({
        'predictions': [{
            'user_id': p.user_id,
            'username': p.user.username,
            'team_a_score': p.team_a_score,
            'team_b_score': p.team_b_score,
            'points': p.points if game.is_scored else None
        } for p in predictions],
        'non_predictors': non_predictors
    }), 200
