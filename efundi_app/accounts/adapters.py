"""Social account adapters for admin authentication."""

from django.contrib import messages
from django.http import HttpResponseRedirect

from allauth.core.exceptions import ImmediateHttpResponse
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.socialaccount.models import SocialApp

from .models import User


class AdminGoogleSocialAccountAdapter(DefaultSocialAccountAdapter):
    """Allow Google admin login only for existing active staff users."""

    def get_app(self, request, provider, client_id=None):
        """Return the configured SocialApp for the provider or redirect if missing.

        If Google login is not configured, show an error and redirect the user
        back to the Django admin login page rather than letting the social login
        flow fail silently.
        """
        try:
            return super().get_app(request, provider, client_id=client_id)
        except SocialApp.DoesNotExist:
            messages.error(
                request,
                'Google login is not configured. Please use the admin login page.',
            )
            raise ImmediateHttpResponse(HttpResponseRedirect('/admin/login/'))

    def pre_social_login(self, request, sociallogin):
        """Bind a Google account only to an existing active admin user.

        This prevents new users from signing up through the Google admin flow.
        Only users with is_staff=True and is_active=True are allowed.
        """
        if sociallogin.is_existing:
            return

        email = (sociallogin.user.email or '').strip()
        user = User.objects.filter(
            email__iexact=email,
            is_staff=True,
            is_active=True,
        ).first()

        if user is None:
            messages.error(
                request,
                'Google login is only available for existing active admin users.',
            )
            raise ImmediateHttpResponse(HttpResponseRedirect('/admin/login/'))

        # Attach the existing admin user to the incoming social login.
        sociallogin.connect(request, user)
