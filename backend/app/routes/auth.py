from flask import Blueprint, request, jsonify, session, current_app
from flask_login import login_user, logout_user, login_required, current_user
from app import db
from app.models.user import User
from app.models.access_log import AccessLog
from app.services.email_service import send_registration_email, send_password_reset_email
import secrets
import string
import threading

bp = Blueprint('auth', __name__, url_prefix='/api/auth')


def generate_random_password(length=10):
    """Generate a random alphanumeric password"""
    characters = string.ascii_letters + string.digits
    return ''.join(secrets.choice(characters) for _ in range(length))


@bp.route('/register', methods=['POST'])
def register():
    """User registration"""
    data = request.get_json()

    # Validate required fields
    required_fields = ['username', 'first_name', 'surname', 'email', 'timezone', 'tournament_winner_id']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    # Check if username already exists
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400

    # Generate random password
    password = generate_random_password()

    # Create new user
    user = User(
        username=data['username'],
        first_name=data['first_name'],
        surname=data['surname'],
        email=data['email'],
        timezone=data['timezone'],
        tournament_winner_id=data['tournament_winner_id']
    )
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    # Send registration email in background thread to avoid blocking the response
    app = current_app._get_current_object()
    thread = threading.Thread(target=send_registration_email, args=(user, password), daemon=True)
    thread.start()

    return jsonify({'message': 'Registration successful', 'user_id': user.id}), 201


@bp.route('/login', methods=['POST'])
def login():
    """User login"""
    data = request.get_json()

    if not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Missing username or password'}), 400

    user = User.query.filter_by(username=data['username']).first()

    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid credentials'}), 401

    login_user(user, remember=True)
    user.last_login = db.func.now()

    # Log access
    log = AccessLog(user_id=user.id, action='login', ip_address=request.remote_addr)
    db.session.add(log)
    db.session.commit()

    return jsonify({
        'message': 'Login successful',
        'user': {
            'id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'surname': user.surname,
            'is_admin': user.is_admin,
            'is_cachier': user.is_cachier,
            'has_paid': user.has_paid
        }
    }), 200


@bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """User logout"""
    # Log access
    log = AccessLog(user_id=current_user.id, action='logout', ip_address=request.remote_addr)
    db.session.add(log)
    db.session.commit()

    logout_user()
    return jsonify({'message': 'Logout successful'}), 200


@bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset user password"""
    data = request.get_json()

    if not data.get('username'):
        return jsonify({'error': 'Username required'}), 400

    user = User.query.filter_by(username=data['username']).first()

    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Generate new random password
    new_password = generate_random_password()
    user.set_password(new_password)
    db.session.commit()

    # Send password reset email
    send_password_reset_email(user, new_password)

    return jsonify({'message': 'New password sent to email'}), 200


@bp.route('/me', methods=['GET'])
@login_required
def get_current_user():
    """Get current user information"""
    return jsonify({
        'id': current_user.id,
        'username': current_user.username,
        'first_name': current_user.first_name,
        'surname': current_user.surname,
        'email': current_user.email,
        'timezone': current_user.timezone,
        'is_admin': current_user.is_admin,
        'is_cachier': current_user.is_cachier,
        'has_paid': current_user.has_paid,
        'tournament_winner_id': current_user.tournament_winner_id
    }), 200
