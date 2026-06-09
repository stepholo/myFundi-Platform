import pytest
from django.db import IntegrityError

from accounts.models import User
from conftest import UserFactory

pytestmark = pytest.mark.django_db


class TestUserModel:
    def test_str_representation(self):
        user = UserFactory(first_name='Jane', last_name='Doe', email='jane@example.com')
        assert str(user) == 'Jane Doe (jane@example.com)'

    def test_password_is_hashed(self):
        user = UserFactory(password='SuperSecret123!')
        assert user.password != 'SuperSecret123!'
        assert user.check_password('SuperSecret123!')

    def test_default_role_is_customer(self):
        user = UserFactory()
        assert user.role == 'Customer'

    def test_email_must_be_unique(self):
        UserFactory(email='dup@example.com')
        with pytest.raises(IntegrityError):
            UserFactory(email='dup@example.com', username='another')

    def test_phone_number_must_be_unique(self):
        UserFactory(phone_number='0712345678')
        with pytest.raises(IntegrityError):
            UserFactory(phone_number='0712345678', username='another', email='other@example.com')

    def test_user_id_is_generated_uuid(self):
        user = UserFactory()
        assert user.user_id is not None

    def test_inactive_by_default_via_factory_override(self):
        user = UserFactory(is_active=False)
        assert User.objects.get(pk=user.pk).is_active is False
