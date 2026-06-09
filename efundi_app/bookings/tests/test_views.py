from decimal import Decimal
from unittest.mock import patch

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from bookings.models import Booking, BookingBroadcast
from conftest import CustomerFactory, TechnicianFactory

pytestmark = pytest.mark.django_db


VALID_BOOKING_PAYLOAD = {
    'service_category': Booking.CATEGORY_ELECTRICAL,
    'description': 'Socket not working',
    'location': '456 Test Avenue, Nairobi',
    'latitude': '-1.28638900',
    'longitude': '36.81722300',
    'scheduled_time': (timezone.now() + timezone.timedelta(days=1)).isoformat(),
}


@pytest.fixture(autouse=True)
def no_dispatch_side_effects(monkeypatch):
    """Booking creation broadcasts to nearby technicians and emails a quotation —
    neither is relevant to the view-layer behaviour under test."""
    monkeypatch.setattr('bookings.views.broadcast_booking', lambda booking: [])
    monkeypatch.setattr('bookings.email_utils.send_quotation_email', lambda booking: None)
    monkeypatch.setattr('bookings.email_utils.send_invoice_email', lambda booking: None)


def _make_verified_available_technician():
    user = TechnicianFactory()
    profile = user.technician_profile
    profile.verification_status = 'Verified'
    profile.is_active = True
    profile.is_available = True
    profile.save(update_fields=['verification_status', 'is_active', 'is_available'])
    return user


class TestBookingCreate:
    url = reverse('booking-list')

    def test_customer_can_create_booking(self, api_client, customer_user):
        api_client.force_authenticate(user=customer_user)
        response = api_client.post(self.url, VALID_BOOKING_PAYLOAD, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        booking = Booking.objects.get(pk=response.data['booking_id'])
        assert booking.customer_id == customer_user.client_profile
        assert booking.status == Booking.STATUS_REQUESTED

    def test_technician_cannot_create_booking(self, api_client, technician_user):
        api_client.force_authenticate(user=technician_user)
        response = api_client.post(self.url, VALID_BOOKING_PAYLOAD, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_user_cannot_create_booking(self, api_client):
        response = api_client.post(self.url, VALID_BOOKING_PAYLOAD, format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestBookingQuerysetScoping:
    list_url = reverse('booking-list')

    def test_customer_sees_only_their_own_bookings(self, api_client, customer_user, make_booking):
        own = make_booking(customer=customer_user)
        other = make_booking()

        api_client.force_authenticate(user=customer_user)
        response = api_client.get(self.list_url)

        results = response.data['results'] if isinstance(response.data, dict) else response.data
        ids = [b['booking_id'] for b in results]
        assert str(own.booking_id) in ids
        assert str(other.booking_id) not in ids

    def test_technician_sees_assigned_bookings(self, api_client, technician_user, make_booking):
        assigned = make_booking(technician=technician_user)
        other = make_booking()

        api_client.force_authenticate(user=technician_user)
        response = api_client.get(self.list_url)

        results = response.data['results'] if isinstance(response.data, dict) else response.data
        ids = [b['booking_id'] for b in results]
        assert str(assigned.booking_id) in ids
        assert str(other.booking_id) not in ids


class TestBookingAcceptAction:
    def _url(self, booking):
        return reverse('booking-accept', kwargs={'pk': booking.booking_id})

    def test_accept_requires_active_technician(self, api_client, make_booking):
        technician_user = TechnicianFactory()
        profile = technician_user.technician_profile
        profile.verification_status = 'Verified'
        profile.is_active = False
        profile.save(update_fields=['verification_status', 'is_active'])

        booking = make_booking(status=Booking.STATUS_BROADCASTED, technician=technician_user,
                               amount=None, worker_amount=None, company_keeps=None)
        BookingBroadcast.objects.create(
            booking_id=booking, technician_id=profile, status=BookingBroadcast.STATUS_SENT,
        )

        api_client.force_authenticate(user=technician_user)
        response = api_client.patch(self._url(booking), {'amount': '1500.00'}, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_accept_requires_amount(self, api_client, make_booking):
        technician_user = _make_verified_available_technician()
        booking = make_booking(status=Booking.STATUS_BROADCASTED, technician=technician_user,
                               amount=None, worker_amount=None, company_keeps=None)
        BookingBroadcast.objects.create(
            booking_id=booking, technician_id=technician_user.technician_profile,
            status=BookingBroadcast.STATUS_SENT,
        )

        api_client.force_authenticate(user=technician_user)
        response = api_client.patch(self._url(booking), {}, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_accept_computes_worker_amount_from_service_fault(self, api_client, make_booking, make_service_fault):
        technician_user = _make_verified_available_technician()
        fault = make_service_fault(company_bill_max=Decimal('2000.00'), worker_max=Decimal('1200.00'))  # 60%
        booking = make_booking(status=Booking.STATUS_BROADCASTED, technician=technician_user,
                               amount=None, worker_amount=None, company_keeps=None)
        booking.service_fault = fault
        booking.save(update_fields=['service_fault'])
        BookingBroadcast.objects.create(
            booking_id=booking, technician_id=technician_user.technician_profile,
            status=BookingBroadcast.STATUS_SENT,
        )

        api_client.force_authenticate(user=technician_user)
        response = api_client.patch(self._url(booking), {'amount': '1500.00'}, format='json')

        assert response.status_code == status.HTTP_200_OK
        booking.refresh_from_db()
        assert booking.amount == Decimal('1500.00')
        assert booking.worker_amount == Decimal('900.00')   # 60% of 1500
        assert booking.company_keeps == Decimal('600.00')
        assert booking.status == Booking.STATUS_ASSIGNED
        assert booking.technician_id == technician_user.technician_profile

    def test_accept_falls_back_to_35_percent_without_service_fault(self, api_client, make_booking):
        technician_user = _make_verified_available_technician()
        booking = make_booking(status=Booking.STATUS_BROADCASTED, technician=technician_user,
                               amount=None, worker_amount=None, company_keeps=None)
        BookingBroadcast.objects.create(
            booking_id=booking, technician_id=technician_user.technician_profile,
            status=BookingBroadcast.STATUS_SENT,
        )

        api_client.force_authenticate(user=technician_user)
        response = api_client.patch(self._url(booking), {'amount': '1000.00'}, format='json')

        assert response.status_code == status.HTTP_200_OK
        booking.refresh_from_db()
        assert booking.worker_amount == Decimal('350.00')   # 35% of 1000
        assert booking.company_keeps == Decimal('650.00')

    def test_second_technician_cannot_accept_already_assigned_booking(self, api_client, make_booking):
        first_tech = _make_verified_available_technician()
        second_tech = _make_verified_available_technician()
        booking = make_booking(status=Booking.STATUS_BROADCASTED, technician=None,
                               amount=None, worker_amount=None, company_keeps=None)
        booking.technician_id = None
        booking.save(update_fields=['technician_id'])
        for tech in (first_tech, second_tech):
            BookingBroadcast.objects.create(
                booking_id=booking, technician_id=tech.technician_profile,
                status=BookingBroadcast.STATUS_SENT,
            )

        api_client.force_authenticate(user=first_tech)
        first_response = api_client.patch(self._url(booking), {'amount': '1000.00'}, format='json')
        assert first_response.status_code == status.HTTP_200_OK

        # Once assigned, the booking drops out of the second technician's queryset
        # (get_queryset only surfaces `broadcasted` bookings for non-assigned techs),
        # so they get a 404 rather than reaching accept_booking's 409 race-condition
        # branch — the "first-accept-wins" guarantee is enforced one layer earlier here.
        api_client.force_authenticate(user=second_tech)
        second_response = api_client.patch(self._url(booking), {'amount': '1200.00'}, format='json')
        assert second_response.status_code == status.HTTP_404_NOT_FOUND
        booking.refresh_from_db()
        assert booking.technician_id == first_tech.technician_profile
        assert booking.amount == Decimal('1000.00')


class TestBookingDeclineAction:
    def test_decline_marks_broadcast_declined(self, api_client, make_booking):
        technician_user = _make_verified_available_technician()
        booking = make_booking(status=Booking.STATUS_BROADCASTED, technician=technician_user,
                               amount=None, worker_amount=None, company_keeps=None)
        broadcast = BookingBroadcast.objects.create(
            booking_id=booking, technician_id=technician_user.technician_profile,
            status=BookingBroadcast.STATUS_SENT,
        )

        api_client.force_authenticate(user=technician_user)
        response = api_client.patch(reverse('booking-decline', kwargs={'pk': booking.booking_id}))

        assert response.status_code == status.HTTP_200_OK
        broadcast.refresh_from_db()
        assert broadcast.status == BookingBroadcast.STATUS_DECLINED

    def test_decline_without_active_broadcast_returns_400(self, api_client, make_booking):
        technician_user = _make_verified_available_technician()
        booking = make_booking(status=Booking.STATUS_BROADCASTED, technician=technician_user,
                               amount=None, worker_amount=None, company_keeps=None)

        api_client.force_authenticate(user=technician_user)
        response = api_client.patch(reverse('booking-decline', kwargs={'pk': booking.booking_id}))
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestBookingStatusTransitions:
    def test_admin_can_reject_requested_booking(self, api_client, admin_user, make_booking):
        booking = make_booking(status=Booking.STATUS_REQUESTED, amount=None, worker_amount=None, company_keeps=None)
        api_client.force_authenticate(user=admin_user)

        response = api_client.patch(reverse('booking-reject', kwargs={'pk': booking.booking_id}))
        assert response.status_code == status.HTTP_200_OK
        booking.refresh_from_db()
        assert booking.status == Booking.STATUS_CANCELLED

    def test_cannot_reject_an_assigned_booking(self, api_client, admin_user, make_booking):
        booking = make_booking(status=Booking.STATUS_ASSIGNED)
        api_client.force_authenticate(user=admin_user)

        response = api_client.patch(reverse('booking-reject', kwargs={'pk': booking.booking_id}))
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_technician_can_start_assigned_booking(self, api_client, make_booking):
        technician_user = _make_verified_available_technician()
        booking = make_booking(status=Booking.STATUS_ASSIGNED, technician=technician_user)
        api_client.force_authenticate(user=technician_user)

        response = api_client.patch(reverse('booking-start', kwargs={'pk': booking.booking_id}))
        assert response.status_code == status.HTTP_200_OK
        booking.refresh_from_db()
        assert booking.status == Booking.STATUS_IN_PROGRESS
        assert booking.started_at is not None

    def test_cannot_start_a_non_assigned_booking(self, api_client, make_booking):
        technician_user = _make_verified_available_technician()
        booking = make_booking(status=Booking.STATUS_REQUESTED, technician=technician_user,
                               amount=None, worker_amount=None, company_keeps=None)
        api_client.force_authenticate(user=technician_user)

        response = api_client.patch(reverse('booking-start', kwargs={'pk': booking.booking_id}))
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_technician_can_complete_in_progress_booking(self, api_client, make_booking):
        technician_user = _make_verified_available_technician()
        booking = make_booking(
            status=Booking.STATUS_IN_PROGRESS, technician=technician_user,
            started_at=timezone.now() - timezone.timedelta(hours=1),
        )
        api_client.force_authenticate(user=technician_user)

        response = api_client.patch(reverse('booking-complete', kwargs={'pk': booking.booking_id}))
        assert response.status_code == status.HTTP_200_OK
        booking.refresh_from_db()
        assert booking.status == Booking.STATUS_COMPLETED
        assert booking.completion_duration is not None

    def test_cannot_complete_a_non_in_progress_booking(self, api_client, make_booking):
        technician_user = _make_verified_available_technician()
        booking = make_booking(status=Booking.STATUS_ASSIGNED, technician=technician_user)
        api_client.force_authenticate(user=technician_user)

        response = api_client.patch(reverse('booking-complete', kwargs={'pk': booking.booking_id}))
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_completed_booking_cannot_be_cancelled(self, api_client, customer_user, make_booking):
        booking = make_booking(customer=customer_user, status=Booking.STATUS_COMPLETED)
        api_client.force_authenticate(user=customer_user)

        response = api_client.patch(reverse('booking-cancel', kwargs={'pk': booking.booking_id}))
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_customer_can_cancel_requested_booking_and_expires_broadcasts(self, api_client, customer_user, make_booking):
        booking = make_booking(customer=customer_user, status=Booking.STATUS_BROADCASTED,
                               technician=None, amount=None, worker_amount=None, company_keeps=None)
        booking.technician_id = None
        booking.save(update_fields=['technician_id'])
        technician_user = TechnicianFactory()
        broadcast = BookingBroadcast.objects.create(
            booking_id=booking, technician_id=technician_user.technician_profile,
            status=BookingBroadcast.STATUS_SENT,
        )

        api_client.force_authenticate(user=customer_user)
        response = api_client.patch(reverse('booking-cancel', kwargs={'pk': booking.booking_id}))

        assert response.status_code == status.HTTP_200_OK
        booking.refresh_from_db()
        broadcast.refresh_from_db()
        assert booking.status == Booking.STATUS_CANCELLED
        assert broadcast.status == BookingBroadcast.STATUS_EXPIRED
