from decimal import Decimal

import pytest

from bookings.models import Booking, ServicePriceList

pytestmark = pytest.mark.django_db


class TestBookingModel:
    def test_str_representation(self, make_booking):
        booking = make_booking(status=Booking.STATUS_ASSIGNED)
        assert str(booking) == f"{booking.customer_id} — {booking.service_category} (assigned)"

    def test_default_status_is_requested(self, make_booking):
        booking = make_booking(status=Booking.STATUS_REQUESTED, amount=None, worker_amount=None, company_keeps=None)
        assert booking.status == Booking.STATUS_REQUESTED


class TestServicePriceListPricing:
    def test_worker_pct_derived_from_max_values(self, make_service_fault):
        fault = make_service_fault(company_bill_max=Decimal('2000.00'), worker_max=Decimal('1200.00'))
        # 1200 / 2000 * 100 = 60.00%
        assert fault.worker_pct == Decimal('60.00')

    def test_worker_pct_falls_back_to_35_percent_when_no_company_bill_max(self, make_service_fault):
        fault = make_service_fault(company_bill_max=Decimal('0.00'), worker_max=Decimal('0.00'))
        assert fault.worker_pct == Decimal('35.00')

    def test_compute_worker_amount_applies_percentage_and_rounds(self, make_service_fault):
        fault = make_service_fault(company_bill_max=Decimal('2000.00'), worker_max=Decimal('1200.00'))
        # 60% of 1500.00 = 900.00
        assert fault.compute_worker_amount(Decimal('1500.00')) == Decimal('900.00')

    def test_str_representation(self, make_service_fault):
        fault = make_service_fault(category=Booking.CATEGORY_PLUMBING, fault_name='Leaking pipe')
        assert str(fault) == 'Plumbing — Leaking pipe'
