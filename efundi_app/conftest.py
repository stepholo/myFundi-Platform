"""Shared pytest fixtures and model factories for the eFundi backend test suite."""

import uuid
from datetime import timedelta
from decimal import Decimal

import factory
import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
        django_get_or_create = ('username',)
        skip_postgeneration_save = True

    username = factory.Sequence(lambda n: f'user{n}')
    email = factory.Sequence(lambda n: f'user{n}@example.com')
    first_name = 'Test'
    last_name = 'User'
    phone_number = factory.Sequence(lambda n: f'07{n:08d}'[:10])
    role = 'Customer'
    is_active = True

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        self.set_password(extracted or 'TestPass123!')
        if create:
            self.save()


class CustomerFactory(UserFactory):
    role = 'Customer'


class TechnicianFactory(UserFactory):
    role = 'Technician'


class AdminFactory(UserFactory):
    role = 'Admin'
    is_staff = True


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def customer_user(db):
    return CustomerFactory()


@pytest.fixture
def technician_user(db):
    return TechnicianFactory()


@pytest.fixture
def admin_user(db):
    return AdminFactory()


@pytest.fixture
def auth_client(api_client, customer_user):
    api_client.force_authenticate(user=customer_user)
    return api_client, customer_user


@pytest.fixture
def make_booking(db):
    """Factory fixture for creating bookings with sensible defaults.

    Customer/technician profiles are created automatically via the
    accounts post_save signals (see customers/technicians signals.py),
    so we derive the Client/Technician profile rows from User instances.
    """
    from bookings.models import Booking

    def _make_booking(customer=None, technician=None, **overrides):
        customer = customer or CustomerFactory()
        technician = technician or TechnicianFactory()
        defaults = dict(
            service_category=Booking.CATEGORY_ELECTRICAL,
            status=Booking.STATUS_ASSIGNED,
            location='123 Test Street, Nairobi',
            latitude=Decimal('-1.28638900'),
            longitude=Decimal('36.81722300'),
            scheduled_time=timezone.now() + timedelta(days=1),
            amount=Decimal('1000.00'),
            worker_amount=Decimal('800.00'),
            company_keeps=Decimal('200.00'),
        )
        defaults.update(overrides)
        return Booking.objects.create(
            customer_id=customer.client_profile,
            technician_id=technician.technician_profile,
            **defaults,
        )

    return _make_booking


@pytest.fixture
def make_service_fault(db):
    """Factory fixture for creating ServicePriceList rows with sensible defaults."""
    from bookings.models import Booking, ServicePriceList

    def _make_service_fault(**overrides):
        defaults = dict(
            category=Booking.CATEGORY_ELECTRICAL,
            fault_name=f'Test Fault {uuid.uuid4().hex[:10]}',
            company_bill_min=Decimal('1000.00'),
            company_bill_max=Decimal('2000.00'),
            worker_min=Decimal('600.00'),
            worker_max=Decimal('1200.00'),
            company_keeps_min=Decimal('400.00'),
            company_keeps_max=Decimal('800.00'),
            is_active=True,
        )
        defaults.update(overrides)
        return ServicePriceList.objects.create(**defaults)

    return _make_service_fault
