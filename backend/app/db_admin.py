"""
Database Admin Interface for Development Mode
Provides a web-based SQLite browser using Flask-Admin
"""
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView
from app import db
from app.models.user import User
from app.models.team import Team
from app.models.location import Location
from app.models.prediction import Prediction
from app.models.prediction_history import PredictionHistory
from app.models.ranking import Ranking
from app.models.ranking_history import RankingHistory
from app.models.news import News
from app.models.access_log import AccessLog
from app.models.competition_round import CompetitionRound
from app.models.game import Game


class UserModelView(ModelView):
    """Custom view for User model"""
    column_exclude_list = ['password_hash']
    column_searchable_list = ['username', 'email', 'first_name', 'surname']
    column_filters = ['is_admin', 'has_paid', 'timezone', 'created_at']
    can_export = True


class SecureModelView(ModelView):
    """Base model view with export enabled"""
    can_export = True
    column_display_pk = True


def init_admin(app):
    """Initialize Flask-Admin for database browsing (development mode only)"""
    admin = Admin(
        app,
        name='ZGoogies DB Browser',
        template_mode='bootstrap4',
        url='/db-admin',
        endpoint='db_admin'
    )

    # Add model views with unique endpoints to avoid blueprint conflicts
    admin.add_view(UserModelView(User, db.session, name='Users', endpoint='admin_users'))
    admin.add_view(SecureModelView(Team, db.session, name='Teams', endpoint='admin_teams'))
    admin.add_view(SecureModelView(Location, db.session, name='Locations', endpoint='admin_locations'))
    admin.add_view(SecureModelView(Game, db.session, name='Games', endpoint='admin_games'))
    admin.add_view(SecureModelView(CompetitionRound, db.session, name='Rounds', endpoint='admin_rounds'))
    admin.add_view(SecureModelView(Prediction, db.session, name='Predictions', endpoint='admin_predictions'))
    admin.add_view(SecureModelView(PredictionHistory, db.session, name='Prediction History', endpoint='admin_prediction_history'))
    admin.add_view(SecureModelView(Ranking, db.session, name='Rankings', endpoint='admin_rankings'))
    admin.add_view(SecureModelView(RankingHistory, db.session, name='Ranking History', endpoint='admin_ranking_history'))
    admin.add_view(SecureModelView(News, db.session, name='News', endpoint='admin_news'))
    admin.add_view(SecureModelView(AccessLog, db.session, name='Access Logs', endpoint='admin_access_logs'))

    return admin
