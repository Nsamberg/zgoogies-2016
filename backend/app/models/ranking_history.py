from datetime import datetime
from app import db


class RankingHistory(db.Model):
    __tablename__ = 'ranking_history'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    competition_round_id = db.Column(db.Integer, db.ForeignKey('competition_rounds.id'), nullable=True)
    # If competition_round_id is None, this is overall ranking history

    # Ranking snapshot
    rank = db.Column(db.Integer, nullable=False)
    total_points = db.Column(db.Integer, nullable=False)

    # Game that triggered this snapshot
    game_id = db.Column(db.Integer, db.ForeignKey('games.id'), nullable=False)

    # Timestamp
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        round_str = f'round={self.competition_round_id}' if self.competition_round_id else 'overall'
        return f'<RankingHistory user={self.user_id} {round_str} rank={self.rank}>'
