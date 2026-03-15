from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app import db
from app.models.prediction import Prediction
from app.models.prediction_history import PredictionHistory
from app.models.game import Game

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
    data = request.get_json()

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
        # Update existing prediction
        prediction.team_a_score = data['team_a_score']
        prediction.team_b_score = data['team_b_score']
    else:
        # Create new prediction
        prediction = Prediction(
            user_id=current_user.id,
            game_id=data['game_id'],
            team_a_score=data['team_a_score'],
            team_b_score=data['team_b_score']
        )
        db.session.add(prediction)

    # Log in history
    history = PredictionHistory(
        user_id=current_user.id,
        game_id=data['game_id'],
        team_a_score=data['team_a_score'],
        team_b_score=data['team_b_score'],
        action=action
    )
    db.session.add(history)
    db.session.commit()

    return jsonify({'message': 'Prediction saved', 'id': prediction.id}), 201


@bp.route('/<int:game_id>', methods=['GET'])
@login_required
def get_game_predictions(game_id):
    """Get all predictions for a specific game (only after predictions close)"""
    game = Game.query.get_or_404(game_id)

    if not game.is_prediction_closed():
        return jsonify({'error': 'Predictions are still open'}), 403

    predictions = Prediction.query.filter_by(game_id=game_id).all()
    return jsonify([{
        'user_id': p.user_id,
        'username': p.user.username,
        'team_a_score': p.team_a_score,
        'team_b_score': p.team_b_score,
        'points': p.points if game.is_scored else None
    } for p in predictions]), 200
