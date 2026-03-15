"""
Setup verification script.
Checks if the application is properly configured and ready to run.
"""
import os
import sys
from pathlib import Path


def check_setup():
    """Verify application setup"""
    print("=== ZGoogies Setup Verification ===\n")

    checks_passed = 0
    checks_total = 0

    # Check 1: Virtual environment
    checks_total += 1
    if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        print("✅ Virtual environment is activated")
        checks_passed += 1
    else:
        print("❌ Virtual environment is NOT activated")
        print("   Run: source venv/Scripts/activate (Git Bash)")
        print("   or: venv\\Scripts\\activate (Command Prompt)")

    # Check 2: Dependencies installed
    checks_total += 1
    try:
        import flask
        import flask_sqlalchemy
        import flask_login
        import flask_mail
        print("✅ Python dependencies are installed")
        checks_passed += 1
    except ImportError as e:
        print(f"❌ Missing Python dependencies: {e}")
        print("   Run: pip install -r requirements.txt")

    # Check 3: Environment file
    checks_total += 1
    env_file = Path('.env')
    if env_file.exists():
        print("✅ .env file exists")
        checks_passed += 1
    else:
        print("❌ .env file is missing")
        print("   Run: cp .env.example .env")
        print("   Then edit .env with your settings")

    # Check 4: Database file
    checks_total += 1
    db_file = Path('zgoogies.db')
    if db_file.exists():
        print("✅ Database file exists")
        checks_passed += 1

        # Check if database has tables
        try:
            from app import create_app, db
            from sqlalchemy import inspect

            app = create_app('development')
            with app.app_context():
                inspector = inspect(db.engine)
                tables = inspector.get_table_names()
                if tables:
                    print(f"   Found {len(tables)} tables")
                else:
                    print("   ⚠️  Database exists but has no tables")
                    print("   Run: python init_db.py")
        except Exception as e:
            print(f"   ⚠️  Could not verify database: {e}")
    else:
        print("❌ Database file is missing")
        print("   Run: python init_db.py")

    # Check 5: Admin user exists
    checks_total += 1
    try:
        from app import create_app, db
        from app.models.user import User

        app = create_app('development')
        with app.app_context():
            admin = User.query.filter_by(is_admin=True).first()
            if admin:
                print(f"✅ Admin user exists: {admin.username}")
                checks_passed += 1
            else:
                print("❌ No admin user found")
                print("   Run: python create_admin.py")
    except Exception as e:
        print(f"❌ Could not check for admin user: {e}")

    # Check 6: Sample data
    checks_total += 1
    try:
        from app import create_app, db
        from app.models.team import Team
        from app.models.game import Game

        app = create_app('development')
        with app.app_context():
            teams = Team.query.count()
            games = Game.query.count()

            if teams > 0 and games > 0:
                print(f"✅ Sample data exists: {teams} teams, {games} games")
                checks_passed += 1
            else:
                print("❌ No sample data found")
                print("   Run: python import_data.py")
    except Exception as e:
        print(f"❌ Could not check sample data: {e}")

    # Summary
    print(f"\n{'='*50}")
    print(f"Checks passed: {checks_passed}/{checks_total}")
    print('='*50)

    if checks_passed == checks_total:
        print("\n🎉 Your backend is ready!")
        print("\nStart the server:")
        print("  python run.py")
        print("\nThen open: http://localhost:5000")
    else:
        print("\n⚠️  Please fix the issues above before starting the server.")
        print("\nQuick fix commands:")
        print("  1. source venv/Scripts/activate")
        print("  2. pip install -r requirements.txt")
        print("  3. cp .env.example .env")
        print("  4. python init_db.py")
        print("  5. python import_data.py")
        print("  6. python create_admin.py")

    return checks_passed == checks_total


if __name__ == '__main__':
    success = check_setup()
    sys.exit(0 if success else 1)
