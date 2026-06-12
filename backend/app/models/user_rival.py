from datetime import datetime
from app import db


class UserRival(db.Model):
    __tablename__ = 'user_rivals'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    rival_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (db.UniqueConstraint('user_id', 'rival_id', name='uq_user_rival'),)

    def __repr__(self):
        return f'<UserRival {self.user_id} -> {self.rival_id}>'
