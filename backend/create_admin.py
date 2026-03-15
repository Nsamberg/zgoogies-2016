"""
Script to create the first admin user for ZGoogies application.
Run this after initializing the database.
"""
import sys
from app import create_app, db
from app.models.user import User


def create_admin_user():
    """Create initial admin user"""
    app = create_app('development')

    with app.app_context():
        # Check if admin already exists
        existing_admin = User.query.filter_by(username='admin').first()
        if existing_admin:
            print("[ERROR] Admin user already exists!")
            print(f"   Username: {existing_admin.username}")
            print(f"   Email: {existing_admin.email}")
            return False

        # Get user input
        print("=== Create Admin User ===\n")

        username = input("Username (default: admin): ").strip() or "admin"
        first_name = input("First Name (default: Admin): ").strip() or "Admin"
        surname = input("Surname (default: User): ").strip() or "User"
        email = input("Email (required): ").strip()

        if not email:
            print("[ERROR] Email is required!")
            return False

        password = input("Password (default: admin123): ").strip() or "admin123"
        timezone = input("Timezone (default: GMT+0): ").strip() or "GMT+0"

        # Create admin user
        admin = User(
            username=username,
            first_name=first_name,
            surname=surname,
            email=email,
            timezone=timezone,
            is_admin=True,
            is_cachier=True,
            is_player=True,
            has_paid=True
        )
        admin.set_password(password)

        try:
            db.session.add(admin)
            db.session.commit()

            print("\n[SUCCESS] Admin user created successfully!")
            print(f"   Username: {username}")
            print(f"   Email: {email}")
            print(f"   Password: {password}")
            print(f"   Roles: Admin, Cachier, Player")
            print("\n[WARNING]  Please change the password after first login!")
            return True

        except Exception as e:
            db.session.rollback()
            print(f"\n[ERROR] Error creating admin user: {str(e)}")
            return False


if __name__ == '__main__':
    success = create_admin_user()
    sys.exit(0 if success else 1)
