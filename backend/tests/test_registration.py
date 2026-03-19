#!/usr/bin/env python3
"""
Test cases for user registration and teams API endpoints.
Tests cover registration validation, team listing, and error handling.
"""

import unittest
import json
from app import create_app, db
from app.models.user import User
from app.models.team import Team


class RegistrationTestCase(unittest.TestCase):
    """Test cases for user registration and teams endpoint"""

    @classmethod
    def setUpClass(cls):
        """Set up test fixtures once for all tests"""
        cls.app = create_app('development')
        cls.app_context = cls.app.app_context()
        cls.app_context.push()
        cls.client = cls.app.test_client()

    @classmethod
    def tearDownClass(cls):
        """Clean up after all tests"""
        cls.app_context.pop()

    def setUp(self):
        """Set up before each test"""
        # Count existing users to avoid conflicts
        self.initial_user_count = User.query.count()

    def tearDown(self):
        """Clean up after each test"""
        # Remove any test users created during the test
        # We'll use a specific test username prefix to identify them
        test_users = User.query.filter(User.username.like('testuser%')).all()
        for user in test_users:
            db.session.delete(user)
        db.session.commit()

    # ===== Teams API Tests =====

    def test_get_teams_endpoint_exists(self):
        """Test that teams endpoint is accessible"""
        response = self.client.get('/api/teams/')
        # Should return 200 (teams exist) or other valid status
        self.assertIn(response.status_code, [200, 401, 404])

    def test_get_teams_returns_list(self):
        """Test that teams endpoint returns a list of teams"""
        response = self.client.get('/api/teams/')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIsInstance(data, list)

    def test_teams_have_required_fields(self):
        """Test that each team has required fields"""
        response = self.client.get('/api/teams/')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)

        if len(data) > 0:
            team = data[0]
            self.assertIn('id', team)
            self.assertIn('name', team)
            self.assertIn('code', team)
            # flag_url is optional
            self.assertIn('flag_url', team)

    def test_teams_are_sorted(self):
        """Test that teams are returned in alphabetical order"""
        response = self.client.get('/api/teams/')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)

        if len(data) > 1:
            # Check that names are in alphabetical order
            names = [team['name'] for team in data]
            self.assertEqual(names, sorted(names), "Teams should be sorted alphabetically")

    # ===== Registration Validation Tests =====

    def test_registration_requires_all_fields(self):
        """Test that registration requires all required fields"""
        # Missing fields
        response = self.client.post('/api/auth/register',
                                    data=json.dumps({}),
                                    content_type='application/json')
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)

    def test_registration_with_missing_username(self):
        """Test registration fails without username"""
        # Get a valid team ID
        team = Team.query.first()
        self.assertIsNotNone(team, "Need at least one team for testing")

        registration_data = {
            'first_name': 'Test',
            'surname': 'User',
            'email': 'test@example.com',
            'timezone': 'UTC',
            'tournament_winner_id': team.id
        }
        response = self.client.post('/api/auth/register',
                                    data=json.dumps(registration_data),
                                    content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_registration_with_missing_email(self):
        """Test registration fails without email"""
        team = Team.query.first()
        self.assertIsNotNone(team, "Need at least one team for testing")

        registration_data = {
            'username': 'testuser_no_email',
            'first_name': 'Test',
            'surname': 'User',
            'timezone': 'UTC',
            'tournament_winner_id': team.id
        }
        response = self.client.post('/api/auth/register',
                                    data=json.dumps(registration_data),
                                    content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_registration_with_missing_tournament_winner(self):
        """Test registration fails without tournament winner selection"""
        registration_data = {
            'username': 'testuser_no_winner',
            'first_name': 'Test',
            'surname': 'User',
            'email': 'test@example.com',
            'timezone': 'UTC'
        }
        response = self.client.post('/api/auth/register',
                                    data=json.dumps(registration_data),
                                    content_type='application/json')
        self.assertEqual(response.status_code, 400)

    # ===== Successful Registration Tests =====

    def test_successful_registration(self):
        """Test successful user registration with all valid data"""
        team = Team.query.first()
        self.assertIsNotNone(team, "Need at least one team for testing")

        registration_data = {
            'username': 'testuser_valid',
            'first_name': 'Test',
            'surname': 'User',
            'email': 'testuser@example.com',
            'timezone': 'Europe/London',
            'tournament_winner_id': team.id
        }

        response = self.client.post('/api/auth/register',
                                    data=json.dumps(registration_data),
                                    content_type='application/json')
        self.assertEqual(response.status_code, 201)

        data = json.loads(response.data)
        self.assertIn('message', data)
        self.assertIn('user_id', data)

        # Verify user was created
        user = User.query.filter_by(username='testuser_valid').first()
        self.assertIsNotNone(user)
        self.assertEqual(user.first_name, 'Test')
        self.assertEqual(user.surname, 'User')
        self.assertEqual(user.email, 'testuser@example.com')
        self.assertEqual(user.timezone, 'Europe/London')
        self.assertEqual(user.tournament_winner_id, team.id)

    def test_duplicate_username_rejected(self):
        """Test that duplicate usernames are rejected"""
        team = Team.query.first()
        self.assertIsNotNone(team, "Need at least one team for testing")

        registration_data = {
            'username': 'testuser_duplicate',
            'first_name': 'Test',
            'surname': 'User',
            'email': 'test1@example.com',
            'timezone': 'UTC',
            'tournament_winner_id': team.id
        }

        # First registration should succeed
        response1 = self.client.post('/api/auth/register',
                                     data=json.dumps(registration_data),
                                     content_type='application/json')
        self.assertEqual(response1.status_code, 201)

        # Second registration with same username should fail
        registration_data['email'] = 'test2@example.com'  # Different email
        response2 = self.client.post('/api/auth/register',
                                     data=json.dumps(registration_data),
                                     content_type='application/json')
        self.assertEqual(response2.status_code, 400)
        data = json.loads(response2.data)
        self.assertIn('error', data)
        self.assertIn('already exists', data['error'].lower())

    def test_user_password_is_generated(self):
        """Test that a password is automatically generated for new user"""
        team = Team.query.first()
        self.assertIsNotNone(team, "Need at least one team for testing")

        registration_data = {
            'username': 'testuser_password',
            'first_name': 'Test',
            'surname': 'User',
            'email': 'testpassword@example.com',
            'timezone': 'UTC',
            'tournament_winner_id': team.id
        }

        response = self.client.post('/api/auth/register',
                                    data=json.dumps(registration_data),
                                    content_type='application/json')
        self.assertEqual(response.status_code, 201)

        # Verify user has a password set
        user = User.query.filter_by(username='testuser_password').first()
        self.assertIsNotNone(user)
        self.assertIsNotNone(user.password_hash)
        self.assertTrue(len(user.password_hash) > 0)

    def test_new_user_defaults(self):
        """Test that new users have correct default values"""
        team = Team.query.first()
        self.assertIsNotNone(team, "Need at least one team for testing")

        registration_data = {
            'username': 'testuser_defaults',
            'first_name': 'Test',
            'surname': 'User',
            'email': 'testdefaults@example.com',
            'timezone': 'UTC',
            'tournament_winner_id': team.id
        }

        response = self.client.post('/api/auth/register',
                                    data=json.dumps(registration_data),
                                    content_type='application/json')
        self.assertEqual(response.status_code, 201)

        # Verify user defaults
        user = User.query.filter_by(username='testuser_defaults').first()
        self.assertIsNotNone(user)
        self.assertFalse(user.is_admin, "New user should not be admin")
        self.assertFalse(user.is_cachier, "New user should not be cashier")
        self.assertFalse(user.has_paid, "New user should not have paid yet")

    # ===== Tournament Winner Tests =====

    def test_registration_with_valid_team_id(self):
        """Test registration accepts valid team ID"""
        teams = Team.query.limit(3).all()
        self.assertGreaterEqual(len(teams), 1, "Need at least one team for testing")

        for i, team in enumerate(teams):
            registration_data = {
                'username': f'testuser_team_{i}',
                'first_name': 'Test',
                'surname': f'User{i}',
                'email': f'testteam{i}@example.com',
                'timezone': 'UTC',
                'tournament_winner_id': team.id
            }

            response = self.client.post('/api/auth/register',
                                        data=json.dumps(registration_data),
                                        content_type='application/json')
            self.assertEqual(response.status_code, 201,
                           f"Registration should succeed with valid team ID {team.id}")

    # ===== Timezone Tests =====

    def test_registration_with_various_timezones(self):
        """Test registration accepts various timezone values"""
        team = Team.query.first()
        self.assertIsNotNone(team, "Need at least one team for testing")

        timezones = ['UTC', 'Europe/London', 'America/New_York', 'Asia/Tokyo']

        for i, timezone in enumerate(timezones):
            registration_data = {
                'username': f'testuser_tz_{i}',
                'first_name': 'Test',
                'surname': f'User{i}',
                'email': f'testtz{i}@example.com',
                'timezone': timezone,
                'tournament_winner_id': team.id
            }

            response = self.client.post('/api/auth/register',
                                        data=json.dumps(registration_data),
                                        content_type='application/json')
            self.assertEqual(response.status_code, 201,
                           f"Registration should succeed with timezone {timezone}")

            # Verify timezone was saved
            user = User.query.filter_by(username=f'testuser_tz_{i}').first()
            self.assertEqual(user.timezone, timezone)


if __name__ == '__main__':
    unittest.main()
