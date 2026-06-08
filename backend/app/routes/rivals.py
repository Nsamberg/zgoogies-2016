from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app import db
from app.models.user_rival import UserRival
from app.models.user import User
from app.models.access_log import AccessLog

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

    rival_username = rival_user.username
    entry = UserRival(user_id=current_user.id, rival_id=rival_id)
    db.session.add(entry)
    log = AccessLog(user_id=current_user.id, action='rival_added',
                    page=f'user:{rival_username}', ip_address=request.remote_addr)
    db.session.add(log)
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

    rival_user = User.query.get(rival_id)
    rival_username = rival_user.username if rival_user else str(rival_id)
    db.session.delete(entry)
    log = AccessLog(user_id=current_user.id, action='rival_removed',
                    page=f'user:{rival_username}', ip_address=request.remote_addr)
    db.session.add(log)
    db.session.commit()
    return jsonify({'message': 'Rival removed'}), 200
