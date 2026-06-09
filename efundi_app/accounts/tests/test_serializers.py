import pytest

from accounts.serializers import UserSerializer
from conftest import UserFactory

pytestmark = pytest.mark.django_db


VALID_PAYLOAD = {
    'username': 'newuser',
    'email': 'newuser@example.com',
    'first_name': 'New',
    'last_name': 'User',
    'phone_number': '0798765432',
    'password': 'StrongPass123!',
    'password2': 'StrongPass123!',
}


class TestUserSerializer:
    def test_valid_payload_creates_user(self):
        serializer = UserSerializer(data=VALID_PAYLOAD)
        assert serializer.is_valid(), serializer.errors
        user = serializer.save()
        assert user.username == 'newuser'
        assert user.check_password('StrongPass123!')

    def test_password_mismatch_is_rejected(self):
        payload = {**VALID_PAYLOAD, 'password2': 'Different123!'}
        serializer = UserSerializer(data=payload)
        assert not serializer.is_valid()
        assert 'password' in serializer.errors

    def test_missing_password_on_registration_is_rejected(self):
        payload = {k: v for k, v in VALID_PAYLOAD.items() if k not in ('password', 'password2')}
        serializer = UserSerializer(data=payload)
        assert not serializer.is_valid()
        assert 'password' in serializer.errors

    def test_full_name_field_is_computed(self):
        user = UserFactory(first_name='Ada', last_name='Lovelace')
        data = UserSerializer(user).data
        assert data['full_name'] == 'Ada Lovelace'

    def test_update_without_password_keeps_existing_password(self):
        user = UserFactory(password='OriginalPass123!')
        serializer = UserSerializer(user, data={'first_name': 'Updated'}, partial=True)
        assert serializer.is_valid(), serializer.errors
        updated = serializer.save()
        assert updated.first_name == 'Updated'
        assert updated.check_password('OriginalPass123!')
