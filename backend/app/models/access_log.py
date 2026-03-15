from datetime import datetime
from app import db


class AccessLog(db.Model):
    __tablename__ = 'access_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Null for anonymous access
    action = db.Column(db.String(50), nullable=False)  # e.g., 'login', 'logout', 'view_page'
    page = db.Column(db.String(100), nullable=True)  # Page/route accessed
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(255), nullable=True)

    # Timestamp
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    def __repr__(self):
        return f'<AccessLog user={self.user_id} action={self.action}>'
