from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError

from reviews.models import Review

pytestmark = pytest.mark.django_db


class TestReviewModel:
    def test_str_representation(self, make_booking, customer_user):
        booking = make_booking(customer=customer_user, status='completed')
        review = Review.objects.create(
            customer_id=customer_user.client_profile,
            technician_id=booking.technician_id,
            booking_id=booking,
            rating=4,
            comment='Good work',
        )
        assert str(review) == f"{customer_user.client_profile} -> {booking.technician_id}: 4"

    def test_rating_below_minimum_fails_validation(self, make_booking, customer_user):
        booking = make_booking(customer=customer_user, status='completed')
        review = Review(
            customer_id=customer_user.client_profile,
            technician_id=booking.technician_id,
            booking_id=booking,
            rating=0,
        )
        with pytest.raises(ValidationError):
            review.full_clean()

    def test_rating_above_maximum_fails_validation(self, make_booking, customer_user):
        booking = make_booking(customer=customer_user, status='completed')
        review = Review(
            customer_id=customer_user.client_profile,
            technician_id=booking.technician_id,
            booking_id=booking,
            rating=6,
        )
        with pytest.raises(ValidationError):
            review.full_clean()

    def test_one_review_per_booking_is_enforced(self, make_booking, customer_user):
        from django.db import IntegrityError
        booking = make_booking(customer=customer_user, status='completed')
        Review.objects.create(
            customer_id=customer_user.client_profile,
            technician_id=booking.technician_id,
            booking_id=booking,
            rating=5,
        )
        with pytest.raises(IntegrityError):
            Review.objects.create(
                customer_id=customer_user.client_profile,
                technician_id=booking.technician_id,
                booking_id=booking,
                rating=3,
            )
