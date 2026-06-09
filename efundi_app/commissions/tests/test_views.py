from decimal import Decimal

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

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


class TestCommissionListAccess:
    url = reverse('commission-list')

    def test_unauthenticated_user_is_denied_access(self, api_client, make_commission):
        make_commission()
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_customer_cannot_view_commissions(self, api_client, customer_user, make_commission):
        make_commission()
        api_client.force_authenticate(user=customer_user)
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_technician_cannot_view_commissions(self, api_client, technician_user, make_commission):
        make_commission()
        api_client.force_authenticate(user=technician_user)
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_can_list_commissions(self, api_client, admin_user, make_commission):
        commission = make_commission(work_done='Plumbing')
        api_client.force_authenticate(user=admin_user)

        response = api_client.get(self.url)

        assert response.status_code == status.HTTP_200_OK
        results = response.data['results'] if isinstance(response.data, dict) else response.data
        ids = [c['commission_id'] for c in results]
        assert str(commission.commission_id) in ids


class TestCommissionSerialization:
    def test_retrieve_includes_customer_and_technician_names(self, api_client, admin_user, make_commission):
        commission = make_commission()
        api_client.force_authenticate(user=admin_user)

        url = reverse('commission-detail', kwargs={'pk': commission.commission_id})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['customer_name'] == (
            f"{commission.customer.first_name} {commission.customer.last_name}"
        )
        assert response.data['technician_name'] == (
            f"{commission.technician.first_name} {commission.technician.last_name}"
        )
        assert response.data['commission_amount'] == str(commission.commission_amount)
        assert response.data['technician_earnings'] == str(commission.technician_earnings)

    def test_retrieve_handles_nullified_customer_and_technician(self, api_client, admin_user, make_commission):
        commission = make_commission()
        commission.customer = None
        commission.technician = None
        commission.save(update_fields=['customer', 'technician'])
        api_client.force_authenticate(user=admin_user)

        url = reverse('commission-detail', kwargs={'pk': commission.commission_id})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['customer_name'] is None
        assert response.data['technician_name'] is None


class TestCommissionAutoCreationFromPayment:
    """End-to-end check that a successful payment callback produces the audit record
    the rest of this app's tests assume exists (see payments/tests/test_views.py for
    the wallet-crediting assertions of the same flow)."""

    @pytest.fixture(autouse=True)
    def no_auto_payout(self, monkeypatch):
        monkeypatch.setattr('payments.tasks.auto_payout_wallet.delay', lambda *a, **kw: None)

    def test_successful_callback_creates_commission_visible_to_admin(self, api_client, admin_user, make_booking):
        booking = make_booking(amount=Decimal('1000.00'), worker_amount=Decimal('800.00'),
                               service_category='Plumbing')
        payment = Payment.objects.create(
            booking_id=booking,
            amount=booking.amount,
            transaction_reference='COMM-REF-001',
            payment_status=Payment.STATUS_PENDING,
            payment_method=Payment.METHOD_CASH,
        )

        callback_response = api_client.post(reverse('payment-callback'), {
            'transaction_reference': 'COMM-REF-001',
            'payment_status': Payment.STATUS_SUCCESSFUL,
        }, format='json')
        assert callback_response.status_code == status.HTTP_200_OK

        commission = Commission.objects.get(payment=payment)
        assert commission.work_done == 'Plumbing'
        assert commission.commission_amount == Decimal('200.00')
        assert commission.technician_earnings == Decimal('800.00')

        api_client.force_authenticate(user=admin_user)
        response = api_client.get(reverse('commission-list'))
        results = response.data['results'] if isinstance(response.data, dict) else response.data
        ids = [c['commission_id'] for c in results]
        assert str(commission.commission_id) in ids
