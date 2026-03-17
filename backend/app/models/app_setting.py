from app import db


class AppSetting(db.Model):
    """Simple key-value store for app-wide settings"""
    __tablename__ = 'app_settings'

    key = db.Column(db.String(50), primary_key=True)
    value = db.Column(db.String(255), nullable=True)

    @classmethod
    def get(cls, key, default=None):
        row = cls.query.get(key)
        return row.value if row else default

    @classmethod
    def set(cls, key, value):
        row = cls.query.get(key)
        if row:
            row.value = value
        else:
            db.session.add(cls(key=key, value=value))
        db.session.commit()

    @classmethod
    def delete(cls, key):
        row = cls.query.get(key)
        if row:
            db.session.delete(row)
            db.session.commit()
