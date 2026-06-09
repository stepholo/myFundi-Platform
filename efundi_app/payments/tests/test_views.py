from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from django.urls import reverse
from rest_framework import status

from commissions.models import Commission
from payments.models import Payment, TechnicianWallet, WithdrawalRequest

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def no_auto_payout(monkeypatch):
    """_process_successful_payment fires a Celery task — keep it from hitting a broker in tests."""
    monkeypatch.setattr('payments.tasks.auto_payout_wallet.delay', lambda *a, **kw: None)


class TestPaymentCallback:
    url = reverse('payment-callback')

    def test_callback_marks_payment_successful_and_credits_wallet_using_worker_amount(self, api_client, make_booking):
        booking = make_booking(amount=Decimal('1000.00'), worker_amount=Decimal('800.00'))
        payment = Payment.objects.create(
            booking_id=booking,
            amount=booking.amount,
            transaction_reference='REF-001',
            payment_status=Payment.STATUS_PENDING,
            payment_method=Payment.METHOD_CASH,
        )

        response = api_client.post(self.url, {
            'transaction_reference': 'REF-001',
            'payment_status': Payment.STATUS_SUCCESSFUL,
        }, format='json')

        assert response.status_code == status.HTTP_200_OK
        payment.refresh_from_db()
        assert payment.payment_status == Payment.STATUS_SUCCESSFUL
        assert payment.is_credited is True
        assert payment.technician_earnings == Decimal('800.00')
        assert payment.commission_amount == Decimal('200.00')

        wallet = TechnicianWallet.objects.get(technician_id=booking.technician_id)
        assert wallet.balance == Decimal('800.00')
        assert wallet.total_earned == Decimal('800.00')

        commission = Commission.objects.get(payment=payment)
        assert commission.commission_amount == Decimal('200.00')
        assert commission.technician_earnings == Decimal('800.00')

    def test_callback_falls_back_to_commission_rate_when_booking_has_no_worker_amount(self, api_client, make_booking):
        booking = make_booking(amount=Decimal('1000.00'), worker_amount=None, company_keeps=None)
        payment = Payment.objects.create(
            booking_id=booking,
            amount=booking.amount,
            transaction_reference='REF-002',
            payment_status=Payment.STATUS_PENDING,
            payment_method=Payment.METHOD_CASH,
        )

        response = api_client.post(self.url, {
            'transaction_reference': 'REF-002',
            'payment_status': Payment.STATUS_SUCCESSFUL,
        }, format='json')

        assert response.status_code == status.HTTP_200_OK
        payment.refresh_from_db()
        # Falls back to the global 20/80 COMMISSION_RATE split
        assert payment.commission_amount == Decimal('200.00')
        assert payment.technician_earnings == Decimal('800.00')

    def test_callback_does_not_double_credit_an_already_credited_payment(self, api_client, make_booking):
        booking = make_booking(amount=Decimal('1000.00'), worker_amount=Decimal('800.00'))
        payment = Payment.objects.create(
            booking_id=booking,
            amount=booking.amount,
            transaction_reference='REF-003',
            payment_status=Payment.STATUS_SUCCESSFUL,
            is_credited=True,
            commission_amount=Decimal('200.00'),
            technician_earnings=Decimal('800.00'),
        )
        wallet = TechnicianWallet.objects.create(
            technician_id=booking.technician_id,
            balance=Decimal('800.00'),
            total_earned=Decimal('800.00'),
        )

        response = api_client.post(self.url, {
            'transaction_reference': 'REF-003',
            'payment_status': Payment.STATUS_SUCCESSFUL,
        }, format='json')

        assert response.status_code == status.HTTP_200_OK
        wallet.refresh_from_db()
        assert wallet.balance == Decimal('800.00')

    def test_callback_requires_reference_and_status(self, api_client):
        response = api_client.post(self.url, {}, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_callback_returns_404_for_unknown_reference(self, api_client):
        response = api_client.post(self.url, {
            'transaction_reference': 'GHOST-REF',
            'payment_status': Payment.STATUS_SUCCESSFUL,
        }, format='json')
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestPaymentViewSetQuerysetScoping:
    def test_customer_only_sees_their_own_payments(self, api_client, make_booking, customer_user):
        own_booking = make_booking(customer=customer_user)
        other_booking = make_booking()
        Payment.objects.create(booking_id=own_booking, amount=Decimal('100.00'), transaction_reference='OWN')
        Payment.objects.create(booking_id=other_booking, amount=Decimal('200.00'), transaction_reference='OTHER')

        api_client.force_authenticate(user=customer_user)
        response = api_client.get(reverse('payment-list'))

        assert response.status_code == status.HTTP_200_OK
        results = response.data['results'] if isinstance(response.data, dict) else response.data
        references = [p['transaction_reference'] for p in results]
        assert 'OWN' in references
        assert 'OTHER' not in references

    def test_unauthenticated_user_is_denied_access(self, api_client, make_booking):
        booking = make_booking()
        Payment.objects.create(booking_id=booking, amount=Decimal('100.00'), transaction_reference='X')

        response = api_client.get(reverse('payment-list'))
        # Permission check (IsCustomer | IsAdminOrSuperAdmin) blocks before get_queryset
        # ever has a chance to scope results for an anonymous user.
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_admin_sees_all_payments(self, api_client, admin_user, make_booking):
        booking = make_booking()
        Payment.objects.create(booking_id=booking, amount=Decimal('100.00'), transaction_reference='ADMINSEE')

        api_client.force_authenticate(user=admin_user)
        response = api_client.get(reverse('payment-list'))

        assert response.status_code == status.HTTP_200_OK
        results = response.data['results'] if isinstance(response.data, dict) else response.data
        references = [p['transaction_reference'] for p in results]
        assert 'ADMINSEE' in references


class TestStkPush:
    url = reverse('intasend-stk-push')

    def test_requires_booking_id_and_phone_number(self, api_client, customer_user):
        api_client.force_authenticate(user=customer_user)
        response = api_client.post(self.url, {}, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_returns_404_for_unknown_booking(self, api_client, customer_user):
        api_client.force_authenticate(user=customer_user)
        response = api_client.post(self.url, {
            'booking_id': '11111111-1111-1111-1111-111111111111',
            'payer_phone_number': '0712345678',
        }, format='json')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_rejects_booking_without_quoted_amount(self, api_client, customer_user, make_booking):
        booking = make_booking(customer=customer_user, amount=None, worker_amount=None, company_keeps=None)
        api_client.force_authenticate(user=customer_user)

        response = api_client.post(self.url, {
            'booking_id': str(booking.booking_id),
            'payer_phone_number': '0712345678',
        }, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_rejects_paying_for_someone_elses_booking(self, api_client, customer_user, make_booking):
        booking = make_booking()  # belongs to a different customer
        api_client.force_authenticate(user=customer_user)

        response = api_client.post(self.url, {
            'booking_id': str(booking.booking_id),
            'payer_phone_number': '0712345678',
        }, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @patch('mpesa_custom.services.IntasendClient')
    def test_successful_stk_push_creates_pending_payment(self, mock_client_cls, api_client, customer_user, make_booking):
        booking = make_booking(customer=customer_user, amount=Decimal('1000.00'))
        mock_client = MagicMock()
        mock_client.send_stk_push.return_value = {'invoice': {'invoice_id': 'INV-123'}}
        mock_client_cls.return_value = mock_client

        api_client.force_authenticate(user=customer_user)
        response = api_client.post(self.url, {
            'booking_id': str(booking.booking_id),
            'payer_phone_number': '0712345678',
        }, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['invoice_id'] == 'INV-123'
        payment = Payment.objects.get(pk=response.data['payment_id'])
        assert payment.payment_status == Payment.STATUS_PENDING
        assert payment.checkout_request_id == 'INV-123'
        assert payment.amount == booking.amount


class TestWithdrawalRequestViewSet:
    list_url = reverse('withdrawal-list')

    def test_unverified_technician_cannot_request_withdrawal(self, api_client, technician_user):
        TechnicianWallet.objects.create(
            technician_id=technician_user.technician_profile, balance=Decimal('100.00'),
        )
        api_client.force_authenticate(user=technician_user)

        response = api_client.post(self.list_url, {
            'amount': Decimal('50.00'),
            'phone_number': '0712345678',
        }, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_verified_technician_can_request_withdrawal(self, api_client, technician_user):
        profile = technician_user.technician_profile
        profile.verification_status = 'Verified'
        profile.save(update_fields=['verification_status'])
        TechnicianWallet.objects.create(technician_id=profile, balance=Decimal('100.00'))

        api_client.force_authenticate(user=technician_user)
        response = api_client.post(self.list_url, {
            'amount': Decimal('50.00'),
            'phone_number': '0712345678',
        }, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        withdrawal = WithdrawalRequest.objects.get(pk=response.data['id'])
        assert withdrawal.technician_id == profile
        assert withdrawal.status == WithdrawalRequest.STATUS_PENDING

    def test_admin_can_reject_pending_withdrawal(self, api_client, admin_user, technician_user):
        profile = technician_user.technician_profile
        withdrawal = WithdrawalRequest.objects.create(
            technician_id=profile, amount=Decimal('50.00'), phone_number='0712345678',
        )
        api_client.force_authenticate(user=admin_user)

        url = reverse('withdrawal-reject', kwargs={'pk': withdrawal.pk})
        response = api_client.patch(url)

        assert response.status_code == status.HTTP_200_OK
        withdrawal.refresh_from_db()
        assert withdrawal.status == WithdrawalRequest.STATUS_REJECTED

    def test_cannot_reject_a_non_pending_withdrawal(self, api_client, admin_user, technician_user):
        profile = technician_user.technician_profile
        withdrawal = WithdrawalRequest.objects.create(
            technician_id=profile, amount=Decimal('50.00'), phone_number='0712345678',
            status=WithdrawalRequest.STATUS_APPROVED,
        )
        api_client.force_authenticate(user=admin_user)

        url = reverse('withdrawal-reject', kwargs={'pk': withdrawal.pk})
        response = api_client.patch(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @patch('mpesa_custom.services.IntasendClient')
    def test_admin_approve_triggers_payout_and_marks_processing(self, mock_client_cls, api_client, admin_user, technician_user):
        profile = technician_user.technician_profile
        TechnicianWallet.objects.create(technician_id=profile, balance=Decimal('200.00'))
        withdrawal = WithdrawalRequest.objects.create(
            technician_id=profile, amount=Decimal('100.00'), phone_number='0712345678',
        )
        mock_client = MagicMock()
        mock_client.send_b2c.return_value = {'tracking_id': 'TRACK-1'}
        mock_client_cls.return_value = mock_client

        api_client.force_authenticate(user=admin_user)
        url = reverse('withdrawal-approve', kwargs={'pk': withdrawal.pk})
        response = api_client.patch(url)

        assert response.status_code == status.HTTP_200_OK
        withdrawal.refresh_from_db()
        assert withdrawal.status == WithdrawalRequest.STATUS_PROCESSING
        assert withdrawal.originator_conversation_id == 'TRACK-1'

    def test_admin_approve_rejects_when_balance_insufficient(self, api_client, admin_user, technician_user):
        profile = technician_user.technician_profile
        TechnicianWallet.objects.create(technician_id=profile, balance=Decimal('10.00'))
        withdrawal = WithdrawalRequest.objects.create(
            technician_id=profile, amount=Decimal('100.00'), phone_number='0712345678',
        )

        api_client.force_authenticate(user=admin_user)
        url = reverse('withdrawal-approve', kwargs={'pk': withdrawal.pk})
        response = api_client.patch(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        withdrawal.refresh_from_db()
        assert withdrawal.status == WithdrawalRequest.STATUS_PENDING
