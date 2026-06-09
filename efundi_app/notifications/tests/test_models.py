import pytest

from notifications.models import Notification

pytestmark = pytest.mark.django_db


class TestNotificationModel:
    def test_str_representation(self, customer_user):
        notif = Notification.objects.create(
            user_id=customer_user,
            title='Test notification',
            message='Hello',
            event_type=Notification.EVENT_SYSTEM,
        )
        assert str(notif) == f"{customer_user} - Test notification"

    def test_default_is_read_is_false(self, customer_user):
        notif = Notification.objects.create(
            user_id=customer_user,
            title='Unread',
            message='msg',
        )
        assert notif.is_read is False

    def test_default_event_type_is_system(self, customer_user):
        notif = Notification.objects.create(
            user_id=customer_user,
            title='x',
            message='y',
        )
        assert notif.event_type == Notification.EVENT_SYSTEM
