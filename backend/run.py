import os
from app import create_app, db
from app.models import (
    User, Team, Location, Game, Prediction, PredictionHistory,
    Ranking, RankingHistory, CompetitionRound, News, AccessLog
)

# Create Flask app
app = create_app(os.getenv('FLASK_ENV', 'development'))


@app.shell_context_processor
def make_shell_context():
    """Make database models available in Flask shell"""
    return {
        'db': db,
        'User': User,
        'Team': Team,
        'Location': Location,
        'Game': Game,
        'Prediction': Prediction,
        'PredictionHistory': PredictionHistory,
        'Ranking': Ranking,
        'RankingHistory': RankingHistory,
        'CompetitionRound': CompetitionRound,
        'News': News,
        'AccessLog': AccessLog
    }


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
