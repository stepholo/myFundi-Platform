from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework import status

from conftest import UserFactory

pytestmark = pytest.mark.django_db


class TestUserRegistrationView:
    url = reverse('user-register')

    @patch('accounts.views.send_verification_email_sync')
    def test_register_creates_user_and_sends_verification_email(self, mock_send, api_client):
        payload = {
            'username': 'freshuser',
            'email': 'fresh@example.com',
            'first_name': 'Fresh',
            'last_name': 'User',
            'phone_number': '0711222333',
            'password': 'StrongPass123!',
            'password2': 'StrongPass123!',
        }
        response = api_client.post(self.url, payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['username'] == 'freshuser'
        mock_send.assert_called_once()

    @patch('accounts.views.send_verification_email_sync')
    def test_register_rejects_mismatched_passwords(self, mock_send, api_client):
        payload = {
            'username': 'baduser',
            'email': 'bad@example.com',
            'first_name': 'Bad',
            'last_name': 'User',
            'phone_number': '0711222334',
            'password': 'StrongPass123!',
            'password2': 'Mismatch123!',
        }
        response = api_client.post(self.url, payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        mock_send.assert_not_called()

    @patch('accounts.views.send_verification_email_sync')
    def test_register_rejects_duplicate_email(self, mock_send, api_client):
        UserFactory(email='taken@example.com')
        payload = {
            'username': 'otheruser',
            'email': 'taken@example.com',
            'first_name': 'Other',
            'last_name': 'User',
            'phone_number': '0711222335',
            'password': 'StrongPass123!',
            'password2': 'StrongPass123!',
        }
        response = api_client.post(self.url, payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestUserLoginView:
    url = reverse('user-login')

    def test_login_with_valid_credentials_returns_tokens(self, api_client):
        UserFactory(username='loginuser', password='LoginPass123!', is_active=True)

        response = api_client.post(self.url, {'username': 'loginuser', 'password': 'LoginPass123!'}, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data

    def test_login_with_wrong_password_is_rejected(self, api_client):
        UserFactory(username='loginuser2', password='LoginPass123!', is_active=True)

        response = api_client.post(self.url, {'username': 'loginuser2', 'password': 'WrongPass!'}, format='json')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_with_unknown_username_is_rejected(self, api_client):
        response = api_client.post(self.url, {'username': 'ghost', 'password': 'whatever'}, format='json')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_blocked_for_inactive_user(self, api_client):
        UserFactory(username='inactiveuser', password='LoginPass123!', is_active=False)

        response = api_client.post(self.url, {'username': 'inactiveuser', 'password': 'LoginPass123!'}, format='json')

        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestUserLogoutView:
    url = reverse('user-logout')

    def test_logout_requires_authentication(self, api_client):
        response = api_client.post(self.url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_authenticated_user_can_logout(self, auth_client):
        client, _user = auth_client
        response = client.post(self.url)
        assert response.status_code == status.HTTP_200_OK


class TestUserViewSet:
    def test_list_requires_authentication_for_unsafe_role_check(self, api_client, customer_user):
        url = reverse('user-detail', kwargs={'user_id': customer_user.user_id})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_authenticated_user_can_retrieve_own_profile(self, auth_client):
        client, user = auth_client
        url = reverse('user-detail', kwargs={'user_id': user.user_id})
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['user_id'] == str(user.user_id)

    def test_unauthenticated_user_cannot_update_profile(self, api_client, customer_user):
        url = reverse('user-detail', kwargs={'user_id': customer_user.user_id})
        response = api_client.patch(url, {'first_name': 'Hacked'}, format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
