from datetime import date
from app import db


class AiUsage(db.Model):
    """Tracks daily MCP/AI tool calls per user for rate limiting."""
    __tablename__ = 'ai_usage'

    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)
    date = db.Column(db.Date, primary_key=True)
    call_count = db.Column(db.Integer, default=0, nullable=False)
