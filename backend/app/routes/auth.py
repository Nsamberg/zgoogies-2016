from flask import Blueprint, request, jsonify, session, current_app
from flask_login import login_user, logout_user, login_required, current_user
from app import db
from app.models.user import User
from app.models.access_log import AccessLog
from app.services.email_service import send_registration_email, send_password_reset_email
import secrets
import string
import threading
import requests as http_requests

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# Google reCAPTCHA v2 verification endpoint
RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'


def verify_recaptcha(token: str) -> bool:
    """Verify a reCAPTCHA v2 token with Google's API.
    In development mode, verification is skipped so local testing
    works without outbound access to Google's API."""
    # Skip verification in development — avoids corporate proxy/firewall issues
    if current_app.config.get('ENV') == 'development' or current_app.config.get('DEBUG'):
        return bool(token)  # Only require that a token was sent
    if not token:
        return False
    secret = current_app.config.get('RECAPTCHA_SECRET_KEY', '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe')
    try:
        resp = http_requests.post(RECAPTCHA_VERIFY_URL, data={'secret': secret, 'response': token}, timeout=5)
        return resp.json().get('success', False)
    except Exception:
        return False


def generate_random_password(length=10):
    """Generate a random alphanumeric password"""
    characters = string.ascii_letters + string.digits
    return ''.join(secrets.choice(characters) for _ in range(length))


@bp.route('/register', methods=['POST'])
def register():
    """User registration"""
    data = request.get_json()

    # Verify CAPTCHA
    if not verify_recaptcha(data.get('captcha_token')):
        return jsonify({'error': 'CAPTCHA verification failed. Please try again.'}), 400

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

    return jsonify({'message': 'Registration successful', 'user_id': user.id, 'password': password}), 201


@bp.route('/login', methods=['POST'])
def login():
    """User login"""
    data = request.get_json()

    if not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Missing username or password'}), 400

    # Verify CAPTCHA
    if not verify_recaptcha(data.get('captcha_token')):
        return jsonify({'error': 'CAPTCHA verification failed. Please try again.'}), 400

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
    """Reset user password — accepts username or email"""
    data = request.get_json()

    identifier = data.get('identifier', '').strip()
    if not identifier:
        return jsonify({'error': 'Username or email required'}), 400

    # Look up by username first, then by email
    user = User.query.filter_by(username=identifier).first()
    if not user:
        user = User.query.filter_by(email=identifier).first()

    if not user:
        return jsonify({'error': 'No account found with that username or email'}), 404

    # Generate new 10-character alphanumeric temporary password
    new_password = generate_random_password(10)
    user.set_password(new_password)
    db.session.commit()

    # Send password reset email in background to avoid blocking
    import threading
    app = current_app._get_current_object()
    thread = threading.Thread(
        target=send_password_reset_email, args=(user, new_password), daemon=True
    )
    thread.start()

    return jsonify({'message': 'Password reset email sent', 'email': user.email}), 200


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
        'tournament_winner_id': current_user.tournament_winner_id,
        'tournament_winner_locked': current_user.tournament_winner_locked
    }), 200


@bp.route('/profile', methods=['PUT'])
@login_required
def update_profile():
    """Update email and/or timezone"""
    data = request.get_json()

    if 'first_name' in data and data['first_name'].strip():
        current_user.first_name = data['first_name'].strip()
    if 'surname' in data and data['surname'].strip():
        current_user.surname = data['surname'].strip()
    if 'email' in data:
        current_user.email = data['email']
    if 'timezone' in data:
        current_user.timezone = data['timezone']
    if 'tournament_winner_id' in data:
        if current_user.tournament_winner_locked:
            return jsonify({'error': 'Tournament winner prediction is locked'}), 403
        current_user.tournament_winner_id = data['tournament_winner_id']

    db.session.commit()
    return jsonify({'message': 'Profile updated'}), 200


@bp.route('/change-password', methods=['PUT'])
@login_required
def change_password():
    """Change password — requires current password"""
    data = request.get_json()

    if not data.get('current_password') or not data.get('new_password'):
        return jsonify({'error': 'Current and new password required'}), 400

    if not current_user.check_password(data['current_password']):
        return jsonify({'error': 'Current password is incorrect'}), 400

    if len(data['new_password']) < 6:
        return jsonify({'error': 'New password must be at least 6 characters'}), 400

    current_user.set_password(data['new_password'])
    db.session.commit()
    return jsonify({'message': 'Password changed successfully'}), 200
