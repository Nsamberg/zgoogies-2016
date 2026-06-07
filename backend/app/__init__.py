from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from flask_mail import Mail
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
from sqlalchemy import event, text
import sqlite3
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
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    # Initialize extensions with app
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    mail.init_app(app)
    CORS(app, origins=app.config['CORS_ORIGINS'], supports_credentials=True)

    # Configure login manager
    # No login_view redirect — this is a pure API, return 401 JSON instead
    # 'basic' marks the session non-fresh on IP/UA mismatch instead of destroying it
    login_manager.session_protection = 'basic'

    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({'error': 'Authentication required'}), 401

    # Register blueprints
    from app.routes import auth, predictions, rankings, players, admin, games, news, teams, mcp, rivals
    app.register_blueprint(auth.bp)
    app.register_blueprint(predictions.bp)
    app.register_blueprint(rankings.bp)
    app.register_blueprint(players.bp)
    app.register_blueprint(admin.bp)
    app.register_blueprint(games.bp)
    app.register_blueprint(news.bp)
    app.register_blueprint(teams.bp)
    app.register_blueprint(mcp.bp)
    app.register_blueprint(rivals.bp)

    # Ensure all tables exist (including newly added models)
    with app.app_context():
        @event.listens_for(db.engine, "connect")
        def set_sqlite_wal(dbapi_conn, connection_record):
            if isinstance(dbapi_conn, sqlite3.Connection):
                dbapi_conn.execute("PRAGMA journal_mode=WAL")
        db.create_all()
        # Add api_token column to existing users table if it doesn't exist yet
        with db.engine.connect() as conn:
            try:
                conn.execute(text('ALTER TABLE users ADD COLUMN api_token VARCHAR(64)'))
                conn.commit()
            except Exception:
                pass  # Column already exists

    # User loader
    from app.models.user import User

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # Initialize database admin interface (admin-only, all environments)
    from app.db_admin import init_admin
    init_admin(app)

    return app
