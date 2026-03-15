from datetime import datetime
from app import db


class Prediction(db.Model):
    __tablename__ = 'predictions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    game_id = db.Column(db.Integer, db.ForeignKey('games.id'), nullable=False)

    # Predicted scores
    team_a_score = db.Column(db.Integer, nullable=False)
    team_b_score = db.Column(db.Integer, nullable=False)

    # Points earned (calculated when game is scored)
    points = db.Column(db.Integer, nullable=True, default=0)
    is_calculated = db.Column(db.Boolean, default=False, nullable=False)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Unique constraint: one prediction per user per game
    __table_args__ = (
        db.UniqueConstraint('user_id', 'game_id', name='unique_user_game_prediction'),
    )

    def calculate_points(self, actual_team_a_score, actual_team_b_score, is_double_points=False):
        """
        Calculate points based on prediction and actual score.

        Points system:
        - 1 point: participation (any prediction)
        - 3 points: correct result (win/draw/loss)
        - 1 point: correct Team A score
        - 1 point: correct Team B score
        - 1 point: exact score bonus

        Maximum: 7 points (or 14 if double points game)
        """
        points = 1  # Participation point

        # Determine actual result
        if actual_team_a_score > actual_team_b_score:
            actual_result = 'A'
        elif actual_team_a_score < actual_team_b_score:
            actual_result = 'B'
        else:
            actual_result = 'D'

        # Determine predicted result
        if self.team_a_score > self.team_b_score:
            predicted_result = 'A'
        elif self.team_a_score < self.team_b_score:
            predicted_result = 'B'
        else:
            predicted_result = 'D'

        # Correct result: 3 points
        if actual_result == predicted_result:
            points += 3

        # Correct Team A score: 1 point
        if self.team_a_score == actual_team_a_score:
            points += 1

        # Correct Team B score: 1 point
        if self.team_b_score == actual_team_b_score:
            points += 1

        # Exact score bonus: 1 point
        if self.team_a_score == actual_team_a_score and self.team_b_score == actual_team_b_score:
            points += 1

        # Double points if applicable
        if is_double_points:
            points *= 2

        return points

    def __repr__(self):
        return f'<Prediction user={self.user_id} game={self.game_id} {self.team_a_score}:{self.team_b_score}>'
