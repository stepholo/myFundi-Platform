from decimal import Decimal

import pytest

from payments.models import TechnicianWallet
from payments.serializers import WithdrawalRequestSerializer

pytestmark = pytest.mark.django_db


class TestWithdrawalRequestSerializer:
    def test_amount_below_minimum_is_rejected(self, technician_user):
        TechnicianWallet.objects.create(
            technician_id=technician_user.technician_profile, balance=Decimal('100.00'),
        )
        serializer = WithdrawalRequestSerializer(data={
            'technician_id': technician_user.technician_profile.pk,
            'amount': Decimal('1.00'),
            'phone_number': '0712345678',
        })
        assert not serializer.is_valid()
        assert 'amount' in serializer.errors

    # NOTE: `technician_id` is a read_only field on this serializer (it's injected
    # by the view's perform_create after is_valid() runs), so validate()'s balance
    # check never actually receives it through the normal is_valid() flow — it's
    # effectively dead code at creation time. We exercise validate() directly here
    # to document its intended behaviour; see also the `approve` action, which is
    # the check that actually guards real payouts.
    def test_validate_rejects_amount_exceeding_balance(self, technician_user):
        profile = technician_user.technician_profile
        TechnicianWallet.objects.create(technician_id=profile, balance=Decimal('50.00'))

        from rest_framework.exceptions import ValidationError
        serializer = WithdrawalRequestSerializer()
        with pytest.raises(ValidationError):
            serializer.validate({'technician_id': profile, 'amount': Decimal('100.00')})

    def test_validate_rejects_when_technician_has_no_wallet(self, technician_user):
        profile = technician_user.technician_profile

        from rest_framework.exceptions import ValidationError
        serializer = WithdrawalRequestSerializer()
        with pytest.raises(ValidationError):
            serializer.validate({'technician_id': profile, 'amount': Decimal('10.00')})

    def test_valid_amount_within_balance_is_accepted(self, technician_user):
        TechnicianWallet.objects.create(
            technician_id=technician_user.technician_profile, balance=Decimal('500.00'),
        )
        serializer = WithdrawalRequestSerializer(data={
            'technician_id': technician_user.technician_profile.pk,
            'amount': Decimal('100.00'),
            'phone_number': '0712345678',
        })
        assert serializer.is_valid(), serializer.errors
