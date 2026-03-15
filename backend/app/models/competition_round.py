from datetime import datetime
from app import db


class CompetitionRound(db.Model):
    """
    Competition Rounds are admin-defined rounds for the ZGoogies prediction competition.
    They group games together for scoring and prize distribution purposes.
    Example: Round 1, Round 2, Round 3, Round 4

    This is different from Tournament Stages (Group Stage, Quarter Finals, etc.)
    which are the actual football tournament phases.
    """
    __tablename__ = 'competition_rounds'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # e.g., "Round 1", "Round 2", "Round 3"
    round_number = db.Column(db.Integer, nullable=False, unique=True)  # 1, 2, 3, etc.

    # Date range (optional - can be used for display/filtering)
    start_date = db.Column(db.DateTime, nullable=True)
    end_date = db.Column(db.DateTime, nullable=True)

    is_current = db.Column(db.Boolean, default=False, nullable=False)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    games = db.relationship('Game', backref='competition_round', lazy='dynamic')
    rankings = db.relationship('Ranking', backref='competition_round', lazy='dynamic')
    ranking_history = db.relationship('RankingHistory', backref='competition_round', lazy='dynamic')

    def is_last_round(self):
        """Check if this is the last competition round (for double points)"""
        max_round = db.session.query(db.func.max(CompetitionRound.round_number)).scalar()
        return self.round_number == max_round

    @staticmethod
    def get_last_round():
        """Get the last competition round"""
        return CompetitionRound.query.order_by(CompetitionRound.round_number.desc()).first()

    def __repr__(self):
        return f'<CompetitionRound {self.name} (Round {self.round_number})>'
