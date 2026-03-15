from datetime import datetime
from app import db


class Location(db.Model):
    __tablename__ = 'locations'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    country = db.Column(db.String(100), nullable=False)
    stadium = db.Column(db.String(150), nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    games = db.relationship('Game', backref='location', lazy='dynamic')

    def __repr__(self):
        return f'<Location {self.city}, {self.country}>'
