from datetime import datetime
from app import db


class NewsComment(db.Model):
    __tablename__ = 'news_comments'

    id = db.Column(db.Integer, primary_key=True)
    news_id = db.Column(db.Integer, db.ForeignKey('news.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    news = db.relationship('News', backref=db.backref('comments', lazy='dynamic', cascade='all, delete-orphan', order_by='NewsComment.created_at'))
    user = db.relationship('User', backref='news_comments')

    def __repr__(self):
        return f'<NewsComment {self.id} by {self.user_id} on {self.news_id}>'
