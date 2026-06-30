from datetime import datetime, timedelta
from app import db
from app.utils.datetime_utils import get_current_utc


class Game(db.Model):
    __tablename__ = 'games'

    id = db.Column(db.Integer, primary_key=True)

    # Teams
    team_a_id = db.Column(db.Integer, db.ForeignKey('teams.id'), nullable=False)
    team_b_id = db.Column(db.Integer, db.ForeignKey('teams.id'), nullable=False)

    # Game details
    game_date = db.Column(db.DateTime, nullable=False)  # Stored in UTC
    location_id = db.Column(db.Integer, db.ForeignKey('locations.id'), nullable=False)
    competition_round_id = db.Column(db.Integer, db.ForeignKey('competition_rounds.id'), nullable=False)

    # Tournament Stage info (e.g., "Group A", "Final", "Semi-Final", "Quarter Final")
    # This represents the actual football tournament phase, not the Competition Round
    stage = db.Column(db.String(50), nullable=True)
    group = db.Column(db.String(10), nullable=True)  # e.g., "A", "B" for group stages

    # Actual scores (null until game is played)
    team_a_score = db.Column(db.Integer, nullable=True)
    team_b_score = db.Column(db.Integer, nullable=True)
    is_scored = db.Column(db.Boolean, default=False, nullable=False)  # True when admin enters scores
    winner_team_id = db.Column(db.Integer, db.ForeignKey('teams.id'), nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    scored_at = db.Column(db.DateTime, nullable=True)  # When admin entered the score

    # Relationships
    predictions = db.relationship('Prediction', backref='game', lazy='dynamic')

    def is_prediction_closed(self):
        """Check if prediction window is closed (2 hours before game)"""
        deadline = self.game_date - timedelta(hours=2)
        return get_current_utc() >= deadline

    def get_prediction_deadline(self):
        """Get the prediction deadline"""
        return self.game_date - timedelta(hours=2)

    def is_double_points(self):
        """
        Check if this game awards double points.
        Games in the last Competition Round award 2x points.
        """
        if self.competition_round:
            return self.competition_round.is_last_round()
        return False

    def __repr__(self):
        return f'<Game {self.id}: {self.team_a.name} vs {self.team_b.name}>'
