from flask_mail import Message
from app import mail


def send_registration_email(app, email, first_name, surname, username, password):
    """Send registration confirmation email with login credentials"""
    with app.app_context():
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

IMPORTANT: Please pay the registration fee (5 GBP) to one of the following cachiers:
- Bruno Spada, Michael Johannes or Florent Maupey (France - Nice)
- Patrick Hebant, Jean-Philippe Gea or Nikolaus Samberger (UK - London)
- Andre de Morais (Madrid)

Payment must be made at the latest the day before the first game is played.

Please read the rules before submitting your predictions: https://zgoogies.online/rules

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
    <p><strong>IMPORTANT:</strong> Please pay the registration fee (5 GBP) to one of the following cachiers:</p>
    <ul>
        <li>Bruno Spada, Michael Johannes or Florent Maupey (France - Nice)</li>
        <li>Patrick Hebant, Jean-Philippe Gea or Nikolaus Samberger (UK - London)</li>
        <li>Andre de Morais (Madrid)</li>
    </ul>
    <p>Payment must be made at the latest the day before the first game is played.</p>

    <h3>Rules</h3>
    <p>Please read the rules before submitting your predictions: <a href="https://zgoogies.online/rules">https://zgoogies.online/rules</a></p>

    <p>You can change your password after logging in through your account settings.</p>

    <p>Best regards,<br>The ZGoogies Team</p>
</body>
</html>
"""

        try:
            mail.send(msg)
        except Exception as e:
            app.logger.error(f"Failed to send registration email to {email}: {str(e)}")


def send_password_reset_email(app, email, first_name, surname, username, new_password):
    """Send password reset email"""
    with app.app_context():
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
            app.logger.error(f"Failed to send password reset email to {email}: {str(e)}")


def send_payment_confirmation_email(app, email, first_name, surname):
    """Send payment confirmation email"""
    with app.app_context():
        msg = Message(
            'ZGoogies - Payment Confirmed',
            recipients=[email]
        )

        msg.body = f"""
Hello {first_name} {surname},

Your payment has been received and confirmed!

IMPORTANT: Please log out and log back in for the change to take effect.
Once you have logged back in, you will be able to submit predictions for all tournament games.

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
    <p><strong>IMPORTANT:</strong> Please <strong>log out and log back in</strong> for the change to take effect.
    Once you have logged back in, you will be able to submit predictions for all tournament games.</p>
    <p>Good luck!</p>
    <p>Best regards,<br>The ZGoogies Team</p>
</body>
</html>
"""

        try:
            mail.send(msg)
        except Exception as e:
            app.logger.error(f"Failed to send payment confirmation email to {email}: {str(e)}")
