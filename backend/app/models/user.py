from datetime import datetime
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from app import db


class User(UserMixin, db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    first_name = db.Column(db.String(120), nullable=False)
    surname = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    timezone = db.Column(db.String(10), nullable=False, default='GMT+0')  # GMT-12 to GMT+12

    # User roles (multiple roles possible)
    is_player = db.Column(db.Boolean, default=True, nullable=False)
    is_cachier = db.Column(db.Boolean, default=False, nullable=False)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)

    # Payment status
    has_paid = db.Column(db.Boolean, default=False, nullable=False)
    payment_received_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    payment_date = db.Column(db.DateTime, nullable=True)

    # Tournament winner prediction
    tournament_winner_id = db.Column(db.Integer, db.ForeignKey('teams.id'), nullable=True)
    tournament_winner_locked = db.Column(db.Boolean, default=False, nullable=False)

    # Personal API token for MCP / AI assistant access
    api_token = db.Column(db.String(64), unique=True, nullable=True, index=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login = db.Column(db.DateTime, nullable=True)

    # Relationships
    predictions = db.relationship('Prediction', backref='user', lazy='dynamic', foreign_keys='Prediction.user_id')
    prediction_history = db.relationship('PredictionHistory', backref='user', lazy='dynamic')
    rankings = db.relationship('Ranking', backref='user', lazy='dynamic')
    ranking_history = db.relationship('RankingHistory', backref='user', lazy='dynamic')
    tournament_winner_team = db.relationship('Team', foreign_keys=[tournament_winner_id])
    payment_received_by = db.relationship('User', remote_side=[id], foreign_keys=[payment_received_by_id])
    access_logs = db.relationship('AccessLog', backref='user', lazy='dynamic')

    def set_password(self, password):
        """Hash and set user password"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Check if provided password matches hash"""
        return check_password_hash(self.password_hash, password)

    def can_predict(self):
        """Check if user can make predictions"""
        return self.has_paid

    def is_cachier_or_admin(self):
        """Check if user is cachier or admin"""
        return self.is_cachier or self.is_admin

    def __repr__(self):
        return f'<User {self.username}>'
