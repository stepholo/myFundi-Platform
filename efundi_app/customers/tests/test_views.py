import pytest
from django.urls import reverse
from rest_framework import status

from conftest import CustomerFactory

pytestmark = pytest.mark.django_db


class TestClientViewSetAccess:
    list_url = reverse('client-list')

    def test_unauthenticated_user_is_denied_access(self, api_client):
        response = api_client.get(self.list_url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_customer_can_list_own_profile(self, api_client, customer_user):
        api_client.force_authenticate(user=customer_user)
        response = api_client.get(self.list_url)

        assert response.status_code == status.HTTP_200_OK
        results = response.data['results'] if isinstance(response.data, dict) else response.data
        user_ids = [str(c['user_id']) for c in results]
        assert str(customer_user.user_id) in user_ids

    def test_customer_cannot_see_other_clients(self, api_client, customer_user):
        other = CustomerFactory()
        api_client.force_authenticate(user=customer_user)
        response = api_client.get(self.list_url)

        results = response.data['results'] if isinstance(response.data, dict) else response.data
        user_ids = [str(c['user_id']) for c in results]
        assert str(other.user_id) not in user_ids

    def test_admin_sees_all_clients(self, api_client, admin_user, customer_user):
        api_client.force_authenticate(user=admin_user)
        response = api_client.get(self.list_url)

        assert response.status_code == status.HTTP_200_OK
        results = response.data['results'] if isinstance(response.data, dict) else response.data
        user_ids = [str(c['user_id']) for c in results]
        assert str(customer_user.user_id) in user_ids

    def test_create_is_not_allowed(self, api_client, customer_user):
        api_client.force_authenticate(user=customer_user)
        response = api_client.post(self.list_url, {}, format='json')
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED


class TestClientProfileUpdate:
    def test_customer_can_update_own_profile(self, api_client, customer_user):
        url = reverse('client-detail', kwargs={'user_id': customer_user.user_id})
        api_client.force_authenticate(user=customer_user)
        response = api_client.patch(url, {}, format='json')
        # No writable fields in the payload — still 200, not a permission error
        assert response.status_code == status.HTTP_200_OK

    def test_customer_cannot_update_another_clients_profile(self, api_client, customer_user):
        other = CustomerFactory()
        url = reverse('client-detail', kwargs={'user_id': other.user_id})
        api_client.force_authenticate(user=customer_user)
        response = api_client.patch(url, {}, format='json')
        # get_queryset() scopes to the authenticated user's own Client row, so accessing
        # another client's UUID resolves to 404 before object-level permission is checked.
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_admin_can_delete_client(self, api_client, admin_user, customer_user):
        url = reverse('client-detail', kwargs={'user_id': customer_user.user_id})
        api_client.force_authenticate(user=admin_user)
        response = api_client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
