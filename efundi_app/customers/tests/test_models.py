import pytest

from customers.models import Client

pytestmark = pytest.mark.django_db


class TestClientModel:
    def test_str_representation(self, customer_user):
        client = customer_user.client_profile
        assert str(client) == f"{client.first_name} {client.last_name} ({client.email})"

    def test_profile_auto_created_via_signal(self, customer_user):
        assert hasattr(customer_user, 'client_profile')
        assert isinstance(customer_user.client_profile, Client)

    def test_profile_mirrors_user_fields(self, customer_user):
        client = customer_user.client_profile
        assert client.first_name == customer_user.first_name
        assert client.last_name == customer_user.last_name
        assert client.email == customer_user.email
        assert client.phone_number == customer_user.phone_number

    def test_default_role_is_customer(self, customer_user):
        assert customer_user.client_profile.role == 'Customer'
