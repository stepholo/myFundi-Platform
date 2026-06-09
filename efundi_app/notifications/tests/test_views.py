import pytest
from django.urls import reverse
from rest_framework import status

from conftest import CustomerFactory
from notifications.models import Notification

pytestmark = pytest.mark.django_db


def _make_notification(user, title='Test', message='msg', event_type=Notification.EVENT_SYSTEM):
    return Notification.objects.create(
        user_id=user, title=title, message=message, event_type=event_type,
    )


class TestNotificationQuerysetScoping:
    list_url = reverse('notification-list')

    def test_unauthenticated_user_is_denied_access(self, api_client):
        response = api_client.get(self.list_url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_user_sees_only_own_notifications(self, api_client, customer_user):
        own = _make_notification(customer_user, title='Mine')
        other_user = CustomerFactory()
        _make_notification(other_user, title='Not mine')

        api_client.force_authenticate(user=customer_user)
        response = api_client.get(self.list_url)

        assert response.status_code == status.HTTP_200_OK
        results = response.data['results'] if isinstance(response.data, dict) else response.data
        titles = [n['title'] for n in results]
        assert 'Mine' in titles
        assert 'Not mine' not in titles

    def test_admin_sees_all_notifications(self, api_client, admin_user, customer_user):
        _make_notification(customer_user, title='Customer notif')

        api_client.force_authenticate(user=admin_user)
        response = api_client.get(self.list_url)

        assert response.status_code == status.HTTP_200_OK
        results = response.data['results'] if isinstance(response.data, dict) else response.data
        titles = [n['title'] for n in results]
        assert 'Customer notif' in titles


class TestNotificationMarkRead:
    def test_mark_read_sets_is_read_true(self, api_client, customer_user):
        notif = _make_notification(customer_user)
        assert notif.is_read is False

        api_client.force_authenticate(user=customer_user)
        url = reverse('notification-mark-read', kwargs={'pk': notif.pk})
        response = api_client.patch(url)

        assert response.status_code == status.HTTP_200_OK
        notif.refresh_from_db()
        assert notif.is_read is True

    def test_user_cannot_mark_read_another_users_notification(self, api_client, customer_user):
        other_user = CustomerFactory()
        notif = _make_notification(other_user)

        api_client.force_authenticate(user=customer_user)
        url = reverse('notification-mark-read', kwargs={'pk': notif.pk})
        response = api_client.patch(url)
        # Notification is filtered from customer_user's queryset → 404
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestNotificationDelete:
    def test_user_can_delete_own_notification(self, api_client, customer_user):
        notif = _make_notification(customer_user)
        api_client.force_authenticate(user=customer_user)
        url = reverse('notification-detail', kwargs={'pk': notif.pk})
        response = api_client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Notification.objects.filter(pk=notif.pk).exists()

    def test_admin_can_create_notification(self, api_client, admin_user, customer_user):
        api_client.force_authenticate(user=admin_user)
        response = api_client.post(reverse('notification-list'), {
            'user_id': customer_user.pk,
            'title': 'Admin-created',
            'message': 'Test message',
            'event_type': Notification.EVENT_SYSTEM,
        }, format='json')
        assert response.status_code == status.HTTP_201_CREATED
