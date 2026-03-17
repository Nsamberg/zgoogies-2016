from datetime import datetime

DATETIME_OVERRIDE_KEY = 'datetime_override'


def get_current_utc() -> datetime:
    """
    Return the current UTC datetime.

    If an admin has set a datetime override (stored in AppSetting), that value
    is returned instead of the real system clock. This allows admins to simulate
    any point in time for testing prediction deadlines, registration windows, etc.
    The override is cleared via the Admin > Settings page.
    """
    try:
        from app.models.app_setting import AppSetting
        override = AppSetting.get(DATETIME_OVERRIDE_KEY)
        if override:
            return datetime.fromisoformat(override)
    except Exception:
        pass
    return datetime.utcnow()
