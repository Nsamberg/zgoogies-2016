"""
Script to create a default admin user for ZGoogies application.
Non-interactive version.
"""
import sys
from app import create_app, db
from app.models.user import User


def create_default_admin():
    """Create default admin user"""
    app = create_app('development')

    with app.app_context():
        # Check if admin already exists
        existing_admin = User.query.filter_by(username='admin').first()
        if existing_admin:
            print("[INFO] Admin user already exists!")
            print(f"   Username: {existing_admin.username}")
            print(f"   Email: {existing_admin.email}")
            return True

        # Create default admin user
        print("=== Creating Default Admin User ===\n")

        admin = User(
            username='admin',
            first_name='Admin',
            surname='User',
            email='admin@zgoogies.com',
            timezone='GMT+0',
            is_admin=True,
            is_cachier=True,
            is_player=True,
            has_paid=True
        )
        admin.set_password('admin123')

        try:
            db.session.add(admin)
            db.session.commit()

            print("[SUCCESS] Admin user created successfully!")
            print(f"   Username: admin")
            print(f"   Email: admin@zgoogies.com")
            print(f"   Password: admin123")
            print(f"   Roles: Admin, Cachier, Player")
            print("\n[WARNING] Please change the password after first login!")
            return True

        except Exception as e:
            db.session.rollback()
            print(f"\n[ERROR] Error creating admin user: {str(e)}")
            return False


if __name__ == '__main__':
    success = create_default_admin()
    sys.exit(0 if success else 1)
