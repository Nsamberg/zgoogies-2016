from flask import current_app
from flask_mail import Message
from app import mail


def send_registration_email(email, first_name, surname, username, password):
    """Send registration confirmation email with login credentials"""
    msg = Message(
        'Welcome to ZGoogies!',
        recipients=[email]
    )

    msg.body = f"""
Hello {first_name} {surname},

Welcome to ZGoogies! Your account has been successfully created.

Your login credentials:
Username: {username}
Password: {password}

IMPORTANT: Please pay the registration fee (5 GBP / 6.5 EUR / 7.5 USD / 9.5 AUD) to one of the following cachiers:
- Bruno Spada (Nice)
- Patrick Hebant or Nikolaus Samberger (London)

Payment must be made at the latest the day before the first game is played.

You can change your password after logging in through your account settings.

Best regards,
The ZGoogies Team
"""

    msg.html = f"""
<html>
<body>
    <h2>Welcome to ZGoogies!</h2>
    <p>Hello {first_name} {surname},</p>
    <p>Your account has been successfully created.</p>

    <h3>Your login credentials:</h3>
    <p><strong>Username:</strong> {username}<br>
    <strong>Password:</strong> {password}</p>

    <h3>Payment Information:</h3>
    <p><strong>IMPORTANT:</strong> Please pay the registration fee (5 GBP / 6.5 EUR / 7.5 USD / 9.5 AUD) to one of the following cachiers:</p>
    <ul>
        <li>Bruno Spada (Nice)</li>
        <li>Patrick Hebant or Nikolaus Samberger (London)</li>
    </ul>
    <p>Payment must be made at the latest the day before the first game is played.</p>

    <p>You can change your password after logging in through your account settings.</p>

    <p>Best regards,<br>The ZGoogies Team</p>
</body>
</html>
"""

    try:
        mail.send(msg)
    except Exception as e:
        current_app.logger.error(f"Failed to send registration email to {email}: {str(e)}")


def send_password_reset_email(email, first_name, surname, username, new_password):
    """Send password reset email"""
    msg = Message(
        'ZGoogies - Password Reset',
        recipients=[email]
    )

    msg.body = f"""
Hello {first_name} {surname},

Your password has been reset.

Your new login credentials:
Username: {username}
Password: {new_password}

Please change your password after logging in through your account settings.

Best regards,
The ZGoogies Team
"""

    msg.html = f"""
<html>
<body>
    <h2>Password Reset</h2>
    <p>Hello {first_name} {surname},</p>
    <p>Your password has been reset.</p>

    <h3>Your new login credentials:</h3>
    <p><strong>Username:</strong> {username}<br>
    <strong>Password:</strong> {new_password}</p>

    <p>Please change your password after logging in through your account settings.</p>

    <p>Best regards,<br>The ZGoogies Team</p>
</body>
</html>
"""

    try:
        mail.send(msg)
    except Exception as e:
        current_app.logger.error(f"Failed to send password reset email to {email}: {str(e)}")


def send_payment_confirmation_email(email, first_name, surname):
    """Send payment confirmation email"""
    msg = Message(
        'ZGoogies - Payment Confirmed',
        recipients=[email]
    )

    msg.body = f"""
Hello {first_name} {surname},

Your payment has been received and confirmed!

You can now make predictions for all tournament games.

Good luck!

Best regards,
The ZGoogies Team
"""

    msg.html = f"""
<html>
<body>
    <h2>Payment Confirmed!</h2>
    <p>Hello {first_name} {surname},</p>
    <p>Your payment has been received and confirmed!</p>
    <p>You can now make predictions for all tournament games.</p>
    <p>Good luck!</p>
    <p>Best regards,<br>The ZGoogies Team</p>
</body>
</html>
"""

    try:
        mail.send(msg)
    except Exception as e:
        current_app.logger.error(f"Failed to send payment confirmation email to {email}: {str(e)}")
