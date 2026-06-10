import logging

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

from utils.tasks import send_email_async
from utils.tokens import email_verification_token_generator
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode


def _send_template_email(subject, template_name, context, to_email):
    recipient_list = [to_email] if isinstance(to_email, str) else list(to_email)
    send_email_async.delay(subject, template_name, context, recipient_list)


def _send_template_email_sync(subject, template_name, context, to_email):
    """Send a template email synchronously (no Celery). Raises on SMTP errors."""
    recipient_list = [to_email] if isinstance(to_email, str) else list(to_email)
    html_message = render_to_string(template_name, context)
    plain_message = strip_tags(html_message)
    send_mail(
        subject,
        plain_message,
        settings.DEFAULT_FROM_EMAIL,
        recipient_list,
        html_message=html_message,
        fail_silently=False,
    )


def _frontend_url(path):
    """Return a fully qualified frontend URL (always uses FRONTEND_URL, never the API host)."""
    return f"{settings.FRONTEND_URL.rstrip('/')}{path}"


def send_verification_email_sync(user, request=None):
    """Send verification email synchronously. Raises smtplib.SMTPRecipientsRefused on invalid recipient."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = email_verification_token_generator.make_token(user)
    verification_url = _frontend_url(f"/verify-email/?uid={uid}&token={token}")
    _send_template_email_sync(
        'Verify your myFundi Hub account',
        'emails/email_verification.html',
        {'first_name': user.first_name, 'verification_url': verification_url},
        user.email,
    )


def send_verification_email(user, request=None):
    """Send an email verification asynchronously using Celery."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = email_verification_token_generator.make_token(user)
    verification_url = _frontend_url(f"/verify-email/?uid={uid}&token={token}")

    context = {
        'first_name': user.first_name,
        'verification_url': verification_url,
    }
    try:
        _send_template_email(
            'Verify your myFundi Hub account',
            'emails/email_verification.html',
            context,
            user.email,
        )
        logging.info(f"Verification email sent to {user.email}")
    except Exception as e:
        logging.error(f"Failed to send verification email to {user.email}: {str(e)}")


def send_password_reset_email(user, request=None):
    """Send a password reset email asynchronously using Celery."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = PasswordResetTokenGenerator().make_token(user)
    reset_url = _frontend_url(f"/reset-password/?uid={uid}&token={token}")

    context = {
        'first_name': user.first_name,
        'reset_url': reset_url,
        'uid': uid,
        'token': token,
    }
    try:
        _send_template_email(
            'Reset your myFundi Hub password',
            'emails/password_reset.html',
            context,
            user.email,
        )
        logging.info(f"Password reset email sent to {user.email}")
    except Exception as e:
        logging.error(f"Failed to send password reset email to {user.email}: {str(e)}")


def send_notification_email(to_email, subject, template_name, context):
    """Send a notification email asynchronously using Celery."""
    try:
        _send_template_email(subject, template_name, context, to_email)
        logging.info(f"Notification email sent to {to_email}")
    except Exception as e:
        logging.error(f"Failed to send notification email to {to_email}: {str(e)}")
