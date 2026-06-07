from flask import Blueprint, jsonify
from flask_login import login_required, current_user
from app import db
from app.models.user_rival import UserRival
from app.models.user import User

bp = Blueprint('rivals', __name__, url_prefix='/api/rivals')


@bp.route('/', methods=['GET'])
@login_required
def get_rivals():
    rival_ids = [r.rival_id for r in current_user.rival_entries]
    return jsonify(rival_ids), 200


@bp.route('/<int:rival_id>', methods=['POST'])
@login_required
def add_rival(rival_id):
    if rival_id == current_user.id:
        return jsonify({'error': 'Cannot add yourself as a rival'}), 400

    rival_user = User.query.get(rival_id)
    if not rival_user:
        return jsonify({'error': 'User not found'}), 404

    existing = UserRival.query.filter_by(
        user_id=current_user.id, rival_id=rival_id
    ).first()
    if existing:
        return jsonify({'message': 'Already a rival'}), 200

    entry = UserRival(user_id=current_user.id, rival_id=rival_id)
    db.session.add(entry)
    db.session.commit()
    return jsonify({'message': 'Rival added'}), 201


@bp.route('/<int:rival_id>', methods=['DELETE'])
@login_required
def remove_rival(rival_id):
    entry = UserRival.query.filter_by(
        user_id=current_user.id, rival_id=rival_id
    ).first()
    if not entry:
        return jsonify({'message': 'Not a rival'}), 200

    db.session.delete(entry)
    db.session.commit()
    return jsonify({'message': 'Rival removed'}), 200
