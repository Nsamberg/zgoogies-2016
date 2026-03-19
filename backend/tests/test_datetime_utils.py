"""Tests for the datetime override utility."""
import pytest
from datetime import datetime
from app import db
from app.models.app_setting import AppSetting
from app.utils.datetime_utils import get_current_utc, DATETIME_OVERRIDE_KEY


class TestGetCurrentUtc:
    def test_returns_datetime(self, app):
        with app.app_context():
            # Ensure no override is set
            AppSetting.set(DATETIME_OVERRIDE_KEY, None)
            result = get_current_utc()
            assert isinstance(result, datetime)

    def test_returns_system_time_when_no_override(self, app):
        with app.app_context():
            AppSetting.set(DATETIME_OVERRIDE_KEY, None)
            before = datetime.utcnow()
            result = get_current_utc()
            after = datetime.utcnow()
            assert before <= result <= after

    def test_returns_override_when_set(self, app):
        override_dt = datetime(2026, 6, 15, 10, 30, 0)
        with app.app_context():
            AppSetting.set(DATETIME_OVERRIDE_KEY, override_dt.isoformat())
            result = get_current_utc()
            assert result == override_dt

    def test_falls_back_to_system_time_on_invalid_override(self, app):
        with app.app_context():
            AppSetting.set(DATETIME_OVERRIDE_KEY, 'not-a-valid-datetime')
            before = datetime.utcnow()
            result = get_current_utc()
            after = datetime.utcnow()
            assert before <= result <= after

    def test_clears_override(self, app):
        with app.app_context():
            AppSetting.set(DATETIME_OVERRIDE_KEY, '2026-06-15T10:00:00')
            AppSetting.set(DATETIME_OVERRIDE_KEY, None)
            # Should now return system time
            before = datetime.utcnow()
            result = get_current_utc()
            after = datetime.utcnow()
            assert before <= result <= after


class TestAppSetting:
    def test_set_and_get(self, app):
        with app.app_context():
            AppSetting.set('test_key', 'test_value')
            assert AppSetting.get('test_key') == 'test_value'

    def test_get_missing_returns_none(self, app):
        with app.app_context():
            assert AppSetting.get('nonexistent_key_xyz') is None

    def test_get_missing_returns_default(self, app):
        with app.app_context():
            assert AppSetting.get('nonexistent_key_xyz', 'default') == 'default'

    def test_overwrite_value(self, app):
        with app.app_context():
            AppSetting.set('overwrite_key', 'first')
            AppSetting.set('overwrite_key', 'second')
            assert AppSetting.get('overwrite_key') == 'second'

    def test_set_none_deletes(self, app):
        with app.app_context():
            AppSetting.set('delete_key', 'something')
            AppSetting.set('delete_key', None)
            assert AppSetting.get('delete_key') is None
