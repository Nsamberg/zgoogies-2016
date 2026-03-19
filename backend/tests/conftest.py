"""
Shared pytest fixtures for ZGoogies test suite.
Uses an in-memory SQLite database seeded with minimal test data.
All tests are fully self-contained — no dependency on the real zgoogies.db.
"""
import pytest
from datetime import datetime, timedelta
from app import create_app, db as _db
from app.models.user import User
from app.models.team import Team
from app.models.location import Location
from app.models.competition_round import CompetitionRound
from app.models.game import Game
from app.models.news import News
from app.models.app_setting import AppSetting


# ---------------------------------------------------------------------------
# App + DB fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope='session')
def app():
    """Create a test Flask application backed by an in-memory SQLite DB."""
    application = create_app('testing')
    with application.app_context():
        _db.create_all()
        _seed(application)
        yield application
        _db.session.remove()
        _db.drop_all()


@pytest.fixture(scope='session')
def client(app):
    """Unauthenticated test client."""
    return app.test_client()


@pytest.fixture(scope='function')
def admin_client(client):
    """Test client pre-authenticated as the admin user."""
    client.post('/api/auth/login',
                json={'username': 'admin', 'password': 'admin123', 'captcha_token': 'test'},
                content_type='application/json')
    yield client
    client.post('/api/auth/logout')


@pytest.fixture(scope='function')
def player_client(client):
    """Test client pre-authenticated as a regular player."""
    client.post('/api/auth/login',
                json={'username': 'player1', 'password': 'pass1234', 'captcha_token': 'test'},
                content_type='application/json')
    yield client
    client.post('/api/auth/logout')


# ---------------------------------------------------------------------------
# Seed helpers
# ---------------------------------------------------------------------------

def _seed(app):
    """Populate the in-memory DB with minimal, realistic test data."""
    with app.app_context():

        # --- Teams ---
        teams = []
        for name, code in [
            ('Argentina', 'ARG'), ('Brazil', 'BRA'),
            ('France', 'FRA'), ('Germany', 'GER'), ('Spain', 'ESP'),
        ]:
            t = Team(name=name, code=code, flag_url=None)
            _db.session.add(t)
            teams.append(t)
        _db.session.flush()

        # --- Location ---
        loc = Location(name='Test Venue', stadium='Test Stadium', city='Test City', country='Test Country')
        _db.session.add(loc)
        _db.session.flush()

        # --- Competition rounds ---
        r1 = CompetitionRound(name='Round 1', round_number=1, is_current=True)
        r2 = CompetitionRound(name='Round 2', round_number=2, is_current=False)
        r3 = CompetitionRound(name='Round 3', round_number=3, is_current=False)
        _db.session.add_all([r1, r2, r3])
        _db.session.flush()

        # --- Games ---
        future = datetime(2026, 7, 15, 18, 0)   # open for predictions
        past = datetime(2020, 6, 10, 18, 0)      # closed (deadline passed)

        g1 = Game(team_a_id=teams[0].id, team_b_id=teams[1].id,
                  game_date=future, location_id=loc.id,
                  competition_round_id=r1.id, stage='Group A',
                  is_scored=False)
        g2 = Game(team_a_id=teams[2].id, team_b_id=teams[3].id,
                  game_date=past, location_id=loc.id,
                  competition_round_id=r1.id, stage='Group B',
                  is_scored=False)
        g3 = Game(team_a_id=teams[4].id, team_b_id=teams[0].id,
                  game_date=past, location_id=loc.id,
                  competition_round_id=r1.id, stage='Group C',
                  is_scored=True, team_a_score=2, team_b_score=1)
        _db.session.add_all([g1, g2, g3])
        _db.session.flush()

        # --- Users ---
        admin = User(username='admin', email='admin@test.com',
                     first_name='Admin', surname='User',
                     timezone='UTC', is_admin=True, is_cachier=False,
                     has_paid=True, tournament_winner_id=teams[0].id)
        admin.set_password('admin123')

        cashier = User(username='cashier1', email='cashier@test.com',
                       first_name='Cash', surname='Ier',
                       timezone='UTC', is_admin=False, is_cachier=True,
                       has_paid=True, tournament_winner_id=teams[1].id)
        cashier.set_password('cash1234')

        player = User(username='player1', email='player1@test.com',
                      first_name='Player', surname='One',
                      timezone='UTC', is_admin=False, is_cachier=False,
                      has_paid=True, tournament_winner_id=teams[1].id)
        player.set_password('pass1234')

        _db.session.add_all([admin, cashier, player])
        _db.session.flush()

        # --- News article (author = admin) ---
        article = News(title='Test Article', content='Test content here.',
                       author_id=admin.id)
        _db.session.add(article)

        _db.session.commit()
