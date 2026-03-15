from datetime import datetime
from app import db


class Ranking(db.Model):
    __tablename__ = 'rankings'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    competition_round_id = db.Column(db.Integer, db.ForeignKey('competition_rounds.id'), nullable=True)
    # If competition_round_id is None, this is the overall ranking

    # Ranking data
    rank = db.Column(db.Integer, nullable=False)
    total_points = db.Column(db.Integer, nullable=False, default=0)
    previous_rank = db.Column(db.Integer, nullable=True)

    # Last game processed for this ranking
    last_game_id = db.Column(db.Integer, db.ForeignKey('games.id'), nullable=True)

    # Timestamps
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Unique constraint: one ranking per user per round (or overall)
    __table_args__ = (
        db.UniqueConstraint('user_id', 'competition_round_id', name='unique_user_round_ranking'),
    )

    def __repr__(self):
        round_str = f'round={self.competition_round_id}' if self.competition_round_id else 'overall'
        return f'<Ranking user={self.user_id} {round_str} rank={self.rank} points={self.total_points}>'
