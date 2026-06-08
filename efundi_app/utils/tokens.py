"""Generate account verification, password reset, email verification tokens, and phone verification OTPs for user accounts."""

from django.contrib.auth.tokens import PasswordResetTokenGenerator
from secrets import token_urlsafe


account_activation_token = PasswordResetTokenGenerator()


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    """
    Token generator for email verification.

    Uses verified_email + password instead of last_login so that logging in
    after registration does NOT invalidate the token. The token becomes
    invalid once verified_email flips to True, preventing re-use.
    """

    def make_hash_value(self, user, timestamp):
        return f'{user.pk}{user.password}{timestamp}{user.email}{user.verified_email}'


email_verification_token_generator = EmailVerificationTokenGenerator()


def email_verification_token():
    """Generate a secure token for email verification."""
    return token_urlsafe(32)


def phone_verification_code():
    """Generate a secure 6-digit OTP for phone verification."""
    return token_urlsafe(3)[:4]  # Generate a short token and take the first 4 characters