from datetime import datetime
from app import db


class PredictionHistory(db.Model):
    __tablename__ = 'prediction_history'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    game_id = db.Column(db.Integer, db.ForeignKey('games.id'), nullable=False)

    # Predicted scores
    team_a_score = db.Column(db.Integer, nullable=False)
    team_b_score = db.Column(db.Integer, nullable=False)

    # Action type: 'N' for New, 'E' for Edit
    action = db.Column(db.String(1), nullable=False)

    # Timestamp
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f'<PredictionHistory user={self.user_id} game={self.game_id} action={self.action}>'
