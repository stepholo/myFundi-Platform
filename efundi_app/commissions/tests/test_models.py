from decimal import Decimal

import pytest
from django.utils import timezone

from commissions.models import Commission
from payments.models import Payment

pytestmark = pytest.mark.django_db


@pytest.fixture
def make_commission(make_booking):
    def _make_commission(**overrides):
        booking = overrides.pop('booking', None) or make_booking()
        payment = Payment.objects.create(
            booking_id=booking,
            amount=booking.amount,
            transaction_reference=f'REF-{booking.booking_id}',
            payment_status=Payment.STATUS_SUCCESSFUL,
            payment_method=Payment.METHOD_CASH,
        )
        defaults = dict(
            payment=payment,
            customer=booking.customer_id,
            technician=booking.technician_id,
            work_done=booking.service_category,
            full_amount=booking.amount,
            commission_amount=Decimal('200.00'),
            technician_earnings=Decimal('800.00'),
            payment_method=Payment.METHOD_CASH,
            paid_at=timezone.now(),
        )
        defaults.update(overrides)
        return Commission.objects.create(**defaults)

    return _make_commission


class TestCommissionModel:
    def test_str_representation(self, make_commission):
        commission = make_commission(work_done='Electrical', commission_amount=Decimal('200.00'))
        assert str(commission) == (
            f"Commission {commission.commission_id} — KSh 200.00 from Electrical job"
        )

    def test_ordered_by_paid_at_descending(self, make_commission):
        older = make_commission(paid_at=timezone.now() - timezone.timedelta(days=1))
        newer = make_commission(paid_at=timezone.now())

        ordered_ids = list(Commission.objects.values_list('commission_id', flat=True))
        assert ordered_ids.index(newer.commission_id) < ordered_ids.index(older.commission_id)

    def test_deleting_customer_cascades_through_booking_and_payment_to_commission(self, make_commission):
        # Commission.customer is SET_NULL, but Booking.customer_id is CASCADE, so
        # deleting the customer's user removes the whole booking → payment →
        # commission chain before the SET_NULL on this FK could ever take effect.
        commission = make_commission()
        commission_id = commission.commission_id
        customer_profile = commission.customer
        customer_profile.user_id.delete()

        assert not Commission.objects.filter(commission_id=commission_id).exists()

    def test_deleting_technician_nullifies_commission_reference(self, make_commission):
        commission = make_commission()
        technician_profile = commission.technician
        technician_profile.user_id.delete()

        commission.refresh_from_db()
        assert commission.technician is None
