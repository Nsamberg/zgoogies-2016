from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from flask_mail import Mail
from flask_cors import CORS
from config import config

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
mail = Mail()


def create_app(config_name='default'):
    """Application factory pattern"""
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Initialize extensions with app
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    mail.init_app(app)
    CORS(app, origins=app.config['CORS_ORIGINS'], supports_credentials=True)

    # Configure login manager
    login_manager.login_view = 'auth.login'
    login_manager.session_protection = 'strong'

    # Register blueprints
    from app.routes import auth, predictions, rankings, players, admin, games, news, teams
    app.register_blueprint(auth.bp)
    app.register_blueprint(predictions.bp)
    app.register_blueprint(rankings.bp)
    app.register_blueprint(players.bp)
    app.register_blueprint(admin.bp)
    app.register_blueprint(games.bp)
    app.register_blueprint(news.bp)
    app.register_blueprint(teams.bp)

    # User loader
    from app.models.user import User

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # Initialize database admin interface (development mode only)
    if app.config.get('DEBUG'):
        from app.db_admin import init_admin
        init_admin(app)
        print("[OK] Database browser available at: http://localhost:5000/db-admin")

    return app
