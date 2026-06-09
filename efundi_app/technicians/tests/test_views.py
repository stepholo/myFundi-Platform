import pytest
from django.urls import reverse
from rest_framework import status

from conftest import TechnicianFactory
from technicians.models import Technician, TechnicianSpecialization

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def no_email_or_notification(monkeypatch):
    """Suppress Celery email tasks and notification DB writes from view side-effects."""
    monkeypatch.setattr('technicians.views.send_notification_email', lambda **kw: None)
    monkeypatch.setattr('technicians.views.create_notification', lambda *a, **kw: None)


class TestTechnicianViewSetAccess:
    list_url = reverse('technician-list')

    def test_unauthenticated_user_is_denied_access(self, api_client):
        response = api_client.get(self.list_url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_technician_sees_only_own_profile(self, api_client, technician_user):
        other = TechnicianFactory()
        api_client.force_authenticate(user=technician_user)
        response = api_client.get(self.list_url)

        assert response.status_code == status.HTTP_200_OK
        results = response.data['results'] if isinstance(response.data, dict) else response.data
        user_ids = [str(t['id']) for t in results]
        assert str(technician_user.user_id) in user_ids
        assert str(other.user_id) not in user_ids

    def test_admin_sees_all_technicians(self, api_client, admin_user, technician_user):
        api_client.force_authenticate(user=admin_user)
        response = api_client.get(self.list_url)

        assert response.status_code == status.HTTP_200_OK
        results = response.data['results'] if isinstance(response.data, dict) else response.data
        user_ids = [str(t['id']) for t in results]
        assert str(technician_user.user_id) in user_ids

    def test_create_is_not_allowed(self, api_client, admin_user):
        api_client.force_authenticate(user=admin_user)
        response = api_client.post(self.list_url, {}, format='json')
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED


class TestTechnicianVerification:
    def test_admin_can_verify_technician(self, api_client, admin_user, technician_user):
        url = reverse('technician-verify', kwargs={'user_id': technician_user.user_id})
        api_client.force_authenticate(user=admin_user)
        response = api_client.patch(url)

        assert response.status_code == status.HTTP_200_OK
        tech = technician_user.technician_profile
        tech.refresh_from_db()
        assert tech.verification_status == 'Verified'
        assert tech.is_active is True

    def test_admin_can_reject_technician(self, api_client, admin_user, technician_user):
        url = reverse('technician-reject', kwargs={'user_id': technician_user.user_id})
        api_client.force_authenticate(user=admin_user)
        response = api_client.patch(url)

        assert response.status_code == status.HTTP_200_OK
        tech = technician_user.technician_profile
        tech.refresh_from_db()
        assert tech.verification_status == 'Rejected'
        assert tech.is_active is False

    def test_technician_cannot_verify_themselves(self, api_client, technician_user):
        url = reverse('technician-verify', kwargs={'user_id': technician_user.user_id})
        api_client.force_authenticate(user=technician_user)
        response = api_client.patch(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_verification_status_rejects_invalid_choice(self, api_client, admin_user, technician_user):
        url = reverse('technician-verification-status', kwargs={'user_id': technician_user.user_id})
        api_client.force_authenticate(user=admin_user)
        response = api_client.patch(url, {'verification_status': 'Invalid'}, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_update_verification_status_to_pending_resets(self, api_client, admin_user, technician_user):
        tech = technician_user.technician_profile
        tech.verification_status = 'Verified'
        tech.save(update_fields=['verification_status'])

        url = reverse('technician-verification-status', kwargs={'user_id': technician_user.user_id})
        api_client.force_authenticate(user=admin_user)
        response = api_client.patch(url, {'verification_status': 'Pending'}, format='json')

        assert response.status_code == status.HTTP_200_OK
        tech.refresh_from_db()
        assert tech.verification_status == 'Pending'


class TestTechnicianAvailability:
    def test_technician_can_set_availability(self, api_client, technician_user):
        tech = technician_user.technician_profile
        tech.verification_status = 'Verified'
        tech.save(update_fields=['verification_status'])

        url = reverse('technician-availability', kwargs={'user_id': technician_user.user_id})
        api_client.force_authenticate(user=technician_user)
        response = api_client.patch(url, {'is_available': True}, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['is_available'] is True

    def test_set_availability_requires_is_available_field(self, api_client, technician_user):
        url = reverse('technician-availability', kwargs={'user_id': technician_user.user_id})
        api_client.force_authenticate(user=technician_user)
        response = api_client.patch(url, {}, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestTechnicianSpecializationViewSet:
    def _spec_list_url(self, user_id):
        return reverse('technician-specialization-list', kwargs={'user_id': user_id})

    def _spec_detail_url(self, user_id, pk):
        return reverse('technician-specialization-detail', kwargs={'user_id': user_id, 'pk': pk})

    def test_technician_can_add_own_specialization(self, api_client, technician_user):
        api_client.force_authenticate(user=technician_user)
        url = self._spec_list_url(technician_user.user_id)
        response = api_client.post(url, {
            'name': 'Electrical',
            'skills': ['wiring', 'fault diagnosis'],
            'years_of_experience': 3,
        }, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        spec = TechnicianSpecialization.objects.get(pk=response.data['id'])
        assert spec.verification_status == 'Pending'
        assert spec.technician == technician_user.technician_profile

    def test_technician_cannot_add_specialization_to_another_profile(
        self, api_client, technician_user
    ):
        other = TechnicianFactory()
        api_client.force_authenticate(user=technician_user)
        url = self._spec_list_url(other.user_id)
        response = api_client.post(url, {'name': 'Plumbing'}, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_can_verify_specialization(self, api_client, admin_user, technician_user):
        spec = TechnicianSpecialization.objects.create(
            technician=technician_user.technician_profile,
            name='Electrical',
            verification_status='Pending',
        )
        api_client.force_authenticate(user=admin_user)
        url = reverse('technician-specialization-verify',
                      kwargs={'user_id': technician_user.user_id, 'pk': spec.pk})
        response = api_client.patch(url)

        assert response.status_code == status.HTTP_200_OK
        spec.refresh_from_db()
        assert spec.verification_status == 'Verified'

    def test_admin_can_reject_specialization(self, api_client, admin_user, technician_user):
        spec = TechnicianSpecialization.objects.create(
            technician=technician_user.technician_profile,
            name='Plumbing',
            verification_status='Pending',
        )
        api_client.force_authenticate(user=admin_user)
        url = reverse('technician-specialization-reject',
                      kwargs={'user_id': technician_user.user_id, 'pk': spec.pk})
        response = api_client.patch(url)

        assert response.status_code == status.HTTP_200_OK
        spec.refresh_from_db()
        assert spec.verification_status == 'Rejected'

    def test_technician_cannot_verify_own_specialization(self, api_client, technician_user):
        spec = TechnicianSpecialization.objects.create(
            technician=technician_user.technician_profile,
            name='Cleaning',
            verification_status='Pending',
        )
        api_client.force_authenticate(user=technician_user)
        url = reverse('technician-specialization-verify',
                      kwargs={'user_id': technician_user.user_id, 'pk': spec.pk})
        response = api_client.patch(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN
