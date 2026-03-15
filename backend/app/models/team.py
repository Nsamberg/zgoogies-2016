from datetime import datetime
from app import db


class Team(db.Model):
    __tablename__ = 'teams'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    code = db.Column(db.String(10), nullable=False, unique=True)  # e.g., 'FRA', 'ENG'
    flag_url = db.Column(db.String(255), nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    games_as_team_a = db.relationship('Game', foreign_keys='Game.team_a_id', backref='team_a', lazy='dynamic')
    games_as_team_b = db.relationship('Game', foreign_keys='Game.team_b_id', backref='team_b', lazy='dynamic')

    def __repr__(self):
        return f'<Team {self.name}>'
