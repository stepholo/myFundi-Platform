from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework import status

from bookings.models import Booking
from payments.models import Payment
from reviews.models import Review

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def no_auto_payout(monkeypatch):
    monkeypatch.setattr('payments.tasks.auto_payout_wallet.delay', lambda *a, **kw: None)


@pytest.fixture
def completed_paid_booking(make_booking, customer_user):
    """A booking that is completed and has a successful payment — ready to review."""
    booking = make_booking(
        customer=customer_user,
        status=Booking.STATUS_COMPLETED,
        amount=Decimal('1000.00'),
        worker_amount=Decimal('800.00'),
    )
    Payment.objects.create(
        booking_id=booking,
        amount=booking.amount,
        transaction_reference='REVIEW-REF-001',
        payment_status=Payment.STATUS_SUCCESSFUL,
        payment_method=Payment.METHOD_CASH,
    )
    return booking


class TestReviewListRetrieve:
    """list and retrieve are AllowAny — no auth required."""
    list_url = reverse('review-list')

    def test_unauthenticated_user_can_list_reviews(self, api_client):
        response = api_client.get(self.list_url)
        assert response.status_code == status.HTTP_200_OK

    def test_unauthenticated_user_can_retrieve_review(self, api_client, make_booking, customer_user):
        booking = make_booking(customer=customer_user, status=Booking.STATUS_COMPLETED)
        review = Review.objects.create(
            customer_id=customer_user.client_profile,
            technician_id=booking.technician_id,
            booking_id=booking,
            rating=4,
        )
        response = api_client.get(reverse('review-detail', kwargs={'pk': review.pk}))
        assert response.status_code == status.HTTP_200_OK


class TestReviewCreate:
    list_url = reverse('review-list')

    def test_customer_can_review_completed_paid_booking(
        self, api_client, customer_user, completed_paid_booking
    ):
        api_client.force_authenticate(user=customer_user)
        response = api_client.post(self.list_url, {
            'booking_id': completed_paid_booking.booking_id,
            'rating': 5,
            'comment': 'Excellent work!',
        }, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        review = Review.objects.get(pk=response.data['id'])
        assert review.customer_id == customer_user.client_profile
        assert review.technician_id == completed_paid_booking.technician_id
        assert review.rating == 5

    def test_cannot_review_non_completed_booking(self, api_client, customer_user, make_booking):
        booking = make_booking(customer=customer_user, status=Booking.STATUS_ASSIGNED)
        api_client.force_authenticate(user=customer_user)
        response = api_client.post(self.list_url, {
            'booking_id': booking.booking_id,
            'rating': 4,
        }, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cannot_review_unpaid_booking(self, api_client, customer_user, make_booking):
        booking = make_booking(customer=customer_user, status=Booking.STATUS_COMPLETED)
        # No Payment created
        api_client.force_authenticate(user=customer_user)
        response = api_client.post(self.list_url, {
            'booking_id': booking.booking_id,
            'rating': 4,
        }, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cannot_review_someone_elses_booking(
        self, api_client, customer_user, completed_paid_booking, make_booking
    ):
        other_booking = make_booking(status=Booking.STATUS_COMPLETED)
        Payment.objects.create(
            booking_id=other_booking,
            amount=Decimal('500.00'),
            transaction_reference='OTHER-PAID',
            payment_status=Payment.STATUS_SUCCESSFUL,
            payment_method=Payment.METHOD_CASH,
        )
        api_client.force_authenticate(user=customer_user)
        response = api_client.post(self.list_url, {
            'booking_id': other_booking.booking_id,
            'rating': 3,
        }, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_cannot_review_same_booking_twice(
        self, api_client, customer_user, completed_paid_booking
    ):
        api_client.force_authenticate(user=customer_user)
        api_client.post(self.list_url, {
            'booking_id': completed_paid_booking.booking_id,
            'rating': 5,
        }, format='json')
        response = api_client.post(self.list_url, {
            'booking_id': completed_paid_booking.booking_id,
            'rating': 3,
        }, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_technician_cannot_create_review(
        self, api_client, technician_user, completed_paid_booking
    ):
        api_client.force_authenticate(user=technician_user)
        response = api_client.post(self.list_url, {
            'booking_id': completed_paid_booking.booking_id,
            'rating': 4,
        }, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestReviewDelete:
    def test_admin_can_delete_review(self, api_client, admin_user, make_booking, customer_user):
        booking = make_booking(customer=customer_user, status=Booking.STATUS_COMPLETED)
        review = Review.objects.create(
            customer_id=customer_user.client_profile,
            technician_id=booking.technician_id,
            booking_id=booking,
            rating=2,
        )
        api_client.force_authenticate(user=admin_user)
        response = api_client.delete(reverse('review-detail', kwargs={'pk': review.pk}))
        assert response.status_code == status.HTTP_204_NO_CONTENT
