"""Signals for the accounts app."""

import threading

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import User

# Thread-local flag: set to True by the registration view when it handles
# email sending synchronously, so the signal doesn't send a duplicate.
_reg_ctx = threading.local()


@receiver(post_save, sender=User, dispatch_uid='send_verification_email_on_create')
def send_verification_email_on_create(sender, instance, created, **kwargs):
    """Send a verification email for new regular users; auto-activate superusers."""
    if not created:
        return

    if instance.is_superuser:
        User.objects.filter(pk=instance.pk).update(is_active=True, role='Super Admin')
        return

    if instance.role == 'Customer':
        User.objects.filter(pk=instance.pk).update(is_active=True)

    if getattr(_reg_ctx, 'sending_sync', False):
        return  # Registration view is sending synchronously — skip async duplicate

    from utils.emails import send_verification_email
    send_verification_email(instance)
