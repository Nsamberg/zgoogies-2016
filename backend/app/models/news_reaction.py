from datetime import datetime
from app import db


class NewsReaction(db.Model):
    __tablename__ = 'news_reactions'

    id = db.Column(db.Integer, primary_key=True)
    news_id = db.Column(db.Integer, db.ForeignKey('news.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    reaction_type = db.Column(db.String(10), nullable=False)  # 'like' or 'dislike'
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Ensure one reaction per user per news item
    __table_args__ = (
        db.UniqueConstraint('news_id', 'user_id', name='unique_user_news_reaction'),
    )

    # Relationships
    news = db.relationship('News', backref=db.backref('reactions', lazy='dynamic', cascade='all, delete-orphan'))
    user = db.relationship('User', backref='news_reactions')

    def __repr__(self):
        return f'<NewsReaction {self.user_id} {self.reaction_type} on {self.news_id}>'
