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
        - 4 points: correct result (win/draw/loss)
        - +2 points: correct goal difference (only when result is also correct)
        - +1 point: exact score bonus (only when result + goal difference are both correct)
        - 0 points: wrong result (no participation point)

        Maximum: 7 points (or 14 if double points game)

        Examples:
          Predict 2-1, actual 2-1 → result ✓, GD ✓, exact ✓ → 7 pts
          Predict 1-0, actual 2-1 → result ✓, GD ✓ (diff=1)  → 6 pts
          Predict 3-0, actual 1-0 → result ✓, GD ✗ (3 vs 1)  → 4 pts
          Predict 0-1, actual 2-0 → result ✗                  → 0 pts
        """
        points = 0

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

        # Wrong result: 0 points
        if actual_result != predicted_result:
            return 0

        # Correct result: 4 points
        points = 4

        # Correct goal difference: +2 points (only when result is correct)
        actual_gd = abs(actual_team_a_score - actual_team_b_score)
        predicted_gd = abs(self.team_a_score - self.team_b_score)
        if actual_gd == predicted_gd:
            points += 2

            # Exact score bonus: +1 point (only when result + GD are both correct)
            if self.team_a_score == actual_team_a_score and self.team_b_score == actual_team_b_score:
                points += 1

        # Double points if applicable
        if is_double_points:
            points *= 2

        return points

    def __repr__(self):
        return f'<Prediction user={self.user_id} game={self.game_id} {self.team_a_score}:{self.team_b_score}>'
