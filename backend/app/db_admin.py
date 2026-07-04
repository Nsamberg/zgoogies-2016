"""
Database Admin Interface — accessible to authenticated admins in all environments.
"""
from flask import redirect
from flask_login import current_user
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


class AdminOnlyView(ModelView):
    """Base view: read-only, admin-only access."""
    can_create = False
    can_edit = False
    can_delete = False
    can_export = True
    column_display_pk = True

    def is_accessible(self):
        return current_user.is_authenticated and current_user.is_admin

    def inaccessible_callback(self, name, **kwargs):
        return redirect('/')


class UserAdminView(AdminOnlyView):
    column_exclude_list = ['password_hash', 'api_token']
    column_searchable_list = ['username', 'email', 'first_name', 'surname']
    column_filters = ['is_admin', 'is_cachier', 'is_player', 'has_paid', 'timezone', 'created_at']


class GameAdminView(AdminOnlyView):
    column_searchable_list = ['stage', 'group']
    column_filters = ['is_scored', 'stage', 'competition_round_id']
    column_list = ['id', 'team_a', 'team_b', 'game_date', 'stage', 'group', 'is_scored',
                   'team_a_score', 'team_b_score', 'location', 'competition_round']


def init_admin(app):
    """Initialize Flask-Admin. Always enabled; protected by is_accessible()."""
    admin = Admin(
        app,
        name='ZGoogies DB Browser',
        template_mode='bootstrap4',
        url='/api/db-admin',
        endpoint='db_admin',
        static_url_path='/api/_admin_static'
    )

    admin.add_view(UserAdminView(User, db.session, name='Users', endpoint='admin_users'))
    admin.add_view(AdminOnlyView(Team, db.session, name='Teams', endpoint='admin_teams'))
    admin.add_view(AdminOnlyView(Location, db.session, name='Locations', endpoint='admin_locations'))
    admin.add_view(GameAdminView(Game, db.session, name='Games', endpoint='admin_games'))
    admin.add_view(AdminOnlyView(CompetitionRound, db.session, name='Rounds', endpoint='admin_rounds'))
    admin.add_view(AdminOnlyView(Prediction, db.session, name='Predictions', endpoint='admin_predictions'))
    admin.add_view(AdminOnlyView(PredictionHistory, db.session, name='Prediction History', endpoint='admin_prediction_history'))
    admin.add_view(AdminOnlyView(Ranking, db.session, name='Rankings', endpoint='admin_rankings'))
    admin.add_view(AdminOnlyView(RankingHistory, db.session, name='Ranking History', endpoint='admin_ranking_history'))
    admin.add_view(AdminOnlyView(News, db.session, name='News', endpoint='admin_news'))
    admin.add_view(AdminOnlyView(AccessLog, db.session, name='Access Logs', endpoint='admin_access_logs'))

    return admin
