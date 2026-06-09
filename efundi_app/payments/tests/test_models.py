from decimal import Decimal

import pytest

from payments.models import Payment, TechnicianWallet, WithdrawalRequest

pytestmark = pytest.mark.django_db


class TestPaymentModel:
    def test_str_representation(self, make_booking):
        booking = make_booking()
        payment = Payment.objects.create(
            booking_id=booking,
            amount=Decimal('1000.00'),
            payment_status=Payment.STATUS_PENDING,
        )
        assert str(payment) == f"{booking} - 1000.00 (Pending)"

    def test_default_status_and_method(self, make_booking):
        booking = make_booking()
        payment = Payment.objects.create(booking_id=booking, amount=Decimal('500.00'))
        assert payment.payment_status == Payment.STATUS_PENDING
        assert payment.payment_method == Payment.METHOD_MPESA
        assert payment.is_credited is False

    def test_transaction_reference_must_be_unique(self, make_booking):
        booking = make_booking()
        Payment.objects.create(
            booking_id=booking, amount=Decimal('100.00'), transaction_reference='REF123',
        )
        with pytest.raises(Exception):
            Payment.objects.create(
                booking_id=make_booking(), amount=Decimal('200.00'), transaction_reference='REF123',
            )


class TestTechnicianWalletModel:
    def test_wallet_defaults_to_zero_balance(self, technician_user):
        wallet = TechnicianWallet.objects.create(technician_id=technician_user.technician_profile)
        assert wallet.balance == Decimal('0')
        assert wallet.total_earned == Decimal('0')
        assert wallet.total_withdrawn == Decimal('0')


class TestWithdrawalRequestModel:
    def test_str_representation(self, technician_user):
        withdrawal = WithdrawalRequest.objects.create(
            technician_id=technician_user.technician_profile,
            amount=Decimal('100.00'),
            phone_number='0712345678',
        )
        assert str(withdrawal) == f"{technician_user.technician_profile} - 100.00 (Pending)"

    def test_default_status_is_pending(self, technician_user):
        withdrawal = WithdrawalRequest.objects.create(
            technician_id=technician_user.technician_profile,
            amount=Decimal('50.00'),
            phone_number='0712345678',
        )
        assert withdrawal.status == WithdrawalRequest.STATUS_PENDING
