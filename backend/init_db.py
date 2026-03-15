"""
Database initialization script.
This script will:
1. Create all database tables
2. Import sample data (optional)
3. Create admin user (optional)
"""
import sys
from app import create_app, db


def init_database():
    """Initialize database and create all tables"""
    app = create_app('development')

    with app.app_context():
        print("=== Database Initialization ===\n")

        try:
            # Create all tables
            print("Creating database tables...")
            db.create_all()
            print("[OK] All tables created successfully!\n")

            # List created tables
            print("Tables created:")
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            for table in inspector.get_table_names():
                print(f"  * {table}")

            print("\n[SUCCESS] Database initialized successfully!")
            print("\nNext steps:")
            print("  1. Import sample data: python import_data.py")
            print("  2. Create admin user: python create_admin.py")
            print("  3. Start the server: python run.py")
            return True

        except Exception as e:
            print(f"\n[ERROR] Error initializing database: {str(e)}")
            return False


if __name__ == '__main__':
    success = init_database()
    sys.exit(0 if success else 1)
