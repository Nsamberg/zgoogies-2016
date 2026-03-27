from datetime import datetime, timedelta

DATETIME_OVERRIDE_KEY = 'datetime_override_offset'


def get_current_utc() -> datetime:
    """
    Return the current UTC datetime.

    If an admin has set a datetime offset (stored in AppSetting as seconds), the offset
    is added to the real clock so simulated time advances in lockstep with real time.
    The override is cleared via the Admin > Settings page.
    """
    try:
        from app.models.app_setting import AppSetting
        offset_str = AppSetting.get(DATETIME_OVERRIDE_KEY)
        if offset_str:
            return datetime.utcnow() + timedelta(seconds=float(offset_str))
    except Exception:
        pass
    return datetime.utcnow()
