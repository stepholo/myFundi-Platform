"""Booking, dispatch tracking, live location, and service pricing models."""

from decimal import Decimal
from uuid import uuid4

from django.db import models


# ---------------------------------------------------------------------------
# Service price list
# ---------------------------------------------------------------------------

class ServicePriceList(models.Model):
    """
    Lookup table of all service/fault items with company-bill and worker-pay ranges.

    Populated by the seed_service_prices management command.
    Technicians set the actual booking amount; worker_amount is derived from
    the worker_pct stored here.
    """

    CATEGORY_FRIDGE = 'Fridge Repair'
    CATEGORY_WASHING_MACHINE = 'Washing Machine'
    CATEGORY_COOKER = 'Cooker & Oven'
    CATEGORY_TELEVISION = 'Television'
    CATEGORY_ELECTRICAL = 'Electrical'
    CATEGORY_SECURITY = 'Security Systems'
    CATEGORY_SOLAR = 'Solar & Power'
    CATEGORY_PLUMBING = 'Plumbing'
    CATEGORY_SMALL_APPLIANCES = 'Small Appliances'
    CATEGORY_OTHER_TECHNICAL = 'Other Technical'
    CATEGORY_CARPENTRY = 'Carpentry'
    CATEGORY_CLEANING = 'Cleaning'

    CATEGORY_CHOICES = (
        (CATEGORY_FRIDGE, 'Fridge & Refrigerator Repair'),
        (CATEGORY_WASHING_MACHINE, 'Washing Machine Repair'),
        (CATEGORY_COOKER, 'Cooker, Oven & Microwave'),
        (CATEGORY_TELEVISION, 'Television & Electronics'),
        (CATEGORY_ELECTRICAL, 'Electrical Installation & Repair'),
        (CATEGORY_SECURITY, 'Security Systems'),
        (CATEGORY_SOLAR, 'Solar & Backup Power'),
        (CATEGORY_PLUMBING, 'Plumbing, Bathroom & Water'),
        (CATEGORY_SMALL_APPLIANCES, 'Small Household Appliances'),
        (CATEGORY_OTHER_TECHNICAL, 'Other Technical Services'),
        (CATEGORY_CARPENTRY, 'Carpentry'),
        (CATEGORY_CLEANING, 'Cleaning'),
    )

    category = models.CharField(max_length=60, choices=CATEGORY_CHOICES, db_index=True)
    fault_name = models.CharField(max_length=120)
    company_bill_min = models.DecimalField(max_digits=10, decimal_places=2)
    company_bill_max = models.DecimalField(max_digits=10, decimal_places=2)
    worker_min = models.DecimalField(max_digits=10, decimal_places=2)
    worker_max = models.DecimalField(max_digits=10, decimal_places=2)
    company_keeps_min = models.DecimalField(max_digits=10, decimal_places=2)
    company_keeps_max = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)

    @property
    def worker_pct(self) -> Decimal:
        """Technician's share as a percentage of the company bill (from max values)."""
        if self.company_bill_max and self.company_bill_max > 0:
            pct = Decimal(str(self.worker_max)) / Decimal(str(self.company_bill_max)) * 100
            return pct.quantize(Decimal('0.01'))
        return Decimal('35.00')

    def compute_worker_amount(self, actual_amount: Decimal) -> Decimal:
        """Return the technician's earnings for the given actual company-bill amount."""
        return (actual_amount * self.worker_pct / 100).quantize(Decimal('0.01'))

    def __str__(self):
        return f"{self.category} — {self.fault_name}"

    class Meta:
        verbose_name = 'Service Price'
        verbose_name_plural = 'Service Prices'
        ordering = ['category', 'fault_name']
        db_table = 'efundi_service_prices'
        unique_together = [['category', 'fault_name']]
        indexes = [
            models.Index(fields=['category', 'is_active'], name='spl_category_active_idx'),
        ]


# ---------------------------------------------------------------------------
# Booking
# ---------------------------------------------------------------------------

class Booking(models.Model):
    """A service request created by a customer, booked and priced by a technician."""

    # Expanded categories — kept backward-compatible (old values still valid)
    CATEGORY_PLUMBING = 'Plumbing'
    CATEGORY_ELECTRICAL = 'Electrical'
    CATEGORY_CARPENTRY = 'Carpentry'
    CATEGORY_CLEANING = 'Cleaning'
    CATEGORY_OTHER = 'Other'
    CATEGORY_FRIDGE = 'Fridge Repair'
    CATEGORY_WASHING_MACHINE = 'Washing Machine'
    CATEGORY_COOKER = 'Cooker & Oven'
    CATEGORY_TELEVISION = 'Television'
    CATEGORY_SECURITY = 'Security Systems'
    CATEGORY_SOLAR = 'Solar & Power'
    CATEGORY_SMALL_APPLIANCES = 'Small Appliances'
    CATEGORY_OTHER_TECHNICAL = 'Other Technical'

    CATEGORY_CHOICES = (
        (CATEGORY_PLUMBING, 'Plumbing, Bathroom & Water'),
        (CATEGORY_ELECTRICAL, 'Electrical Installation & Repair'),
        (CATEGORY_FRIDGE, 'Fridge & Refrigerator Repair'),
        (CATEGORY_WASHING_MACHINE, 'Washing Machine Repair'),
        (CATEGORY_COOKER, 'Cooker, Oven & Microwave'),
        (CATEGORY_TELEVISION, 'Television & Electronics'),
        (CATEGORY_SECURITY, 'Security Systems'),
        (CATEGORY_SOLAR, 'Solar & Backup Power'),
        (CATEGORY_SMALL_APPLIANCES, 'Small Household Appliances'),
        (CATEGORY_OTHER_TECHNICAL, 'Other Technical Services'),
        (CATEGORY_CARPENTRY, 'Carpentry'),
        (CATEGORY_CLEANING, 'Cleaning'),
        (CATEGORY_OTHER, 'Other'),
    )

    STATUS_REQUESTED = 'requested'
    STATUS_BROADCASTED = 'broadcasted'
    STATUS_ASSIGNED = 'assigned'
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_COMPLETED = 'completed'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = (
        (STATUS_REQUESTED, 'Pending'),
        (STATUS_BROADCASTED, 'Broadcasted'),
        (STATUS_ASSIGNED, 'Assigned'),
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_CANCELLED, 'Cancelled'),
    )

    booking_id = models.UUIDField(primary_key=True, default=uuid4, editable=False)

    customer_id = models.ForeignKey(
        'customers.Client',
        on_delete=models.CASCADE,
        related_name='bookings',
        db_column='customer_id',
    )
    technician_id = models.ForeignKey(
        'technicians.Technician',
        on_delete=models.SET_NULL,
        related_name='assigned_bookings',
        db_column='technician_id',
        null=True,
        blank=True,
    )
    service_category = models.CharField(
        max_length=60,
        choices=CATEGORY_CHOICES,
    )
    # Specific fault/service selected by the customer from the price list
    service_fault = models.ForeignKey(
        ServicePriceList,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bookings',
        help_text='Specific service/fault chosen from the price list.',
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_REQUESTED,
    )
    completion_duration = models.DurationField(blank=True, null=True)
    # Amount is the company bill — set by the technician when they accept the job
    amount = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True, default=None,
        help_text='Company bill — total amount the customer pays.',
    )
    # Derived from service_fault worker_pct when amount is set
    worker_amount = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True, default=None,
        help_text='Technician earnings — what the worker receives.',
    )
    company_keeps = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True, default=None,
        help_text='eFundi platform share (company bill minus worker amount).',
    )
    description = models.TextField(blank=True, null=True)
    location = models.CharField(max_length=255)
    latitude = models.DecimalField(max_digits=11, decimal_places=8)
    longitude = models.DecimalField(max_digits=11, decimal_places=8)
    scheduled_time = models.DateTimeField()
    assigned_at = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    assignment_expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.customer_id} — {self.service_category} ({self.status})"

    class Meta:
        verbose_name = 'Booking'
        verbose_name_plural = 'Bookings'
        ordering = ['-created_at']
        db_table = 'efundi_bookings'
        indexes = [
            models.Index(fields=['status'], name='booking_status_idx'),
            models.Index(fields=['service_category'], name='booking_category_idx'),
            models.Index(fields=['scheduled_time'], name='booking_scheduled_time_idx'),
            models.Index(fields=['created_at'], name='booking_created_at_idx'),
            models.Index(fields=['assignment_expires_at'], name='booking_expires_at_idx'),
        ]


# ---------------------------------------------------------------------------
# Broadcast / Location (unchanged)
# ---------------------------------------------------------------------------

class BookingBroadcast(models.Model):
    """Tracks each technician's response to a broadcasted booking request."""

    STATUS_SENT = 'sent'
    STATUS_VIEWED = 'viewed'
    STATUS_ACCEPTED = 'accepted'
    STATUS_DECLINED = 'declined'
    STATUS_EXPIRED = 'expired'

    STATUS_CHOICES = (
        (STATUS_SENT, 'Sent'),
        (STATUS_VIEWED, 'Viewed'),
        (STATUS_ACCEPTED, 'Accepted'),
        (STATUS_DECLINED, 'Declined'),
        (STATUS_EXPIRED, 'Expired'),
    )

    booking_id = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name='broadcasts',
        db_column='booking_id',
    )
    technician_id = models.ForeignKey(
        'technicians.Technician',
        on_delete=models.CASCADE,
        related_name='received_broadcasts',
        db_column='technician_id',
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default=STATUS_SENT,
    )
    sent_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Broadcast {self.booking_id_id} → {self.technician_id} ({self.status})"

    class Meta:
        verbose_name = 'Booking Broadcast'
        verbose_name_plural = 'Booking Broadcasts'
        ordering = ['-sent_at']
        db_table = 'efundi_booking_broadcasts'
        unique_together = [['booking_id', 'technician_id']]
        indexes = [
            models.Index(fields=['status'], name='broadcast_status_idx'),
            models.Index(
                fields=['booking_id', 'status'],
                name='broadcast_booking_status_idx',
            ),
        ]


class TechnicianLocation(models.Model):
    """Latest live location for a technician."""

    ONLINE_THRESHOLD_SECONDS = 300   # 5 min — used by dispatch & is_online property
    NEARBY_THRESHOLD_SECONDS = 900   # 15 min — used by the customer nearby-search display

    technician_id = models.OneToOneField(
        'technicians.Technician',
        on_delete=models.CASCADE,
        related_name='live_location',
        db_column='technician_id',
    )
    latitude = models.DecimalField(max_digits=11, decimal_places=8)
    longitude = models.DecimalField(max_digits=11, decimal_places=8)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_online(self) -> bool:
        from django.utils import timezone
        return (timezone.now() - self.updated_at).total_seconds() < self.ONLINE_THRESHOLD_SECONDS

    def __str__(self):
        return f"{self.technician_id} @ {self.latitude}, {self.longitude}"

    class Meta:
        verbose_name = 'Technician Location'
        verbose_name_plural = 'Technician Locations'
        ordering = ['-updated_at']
        db_table = 'efundi_technician_locations'
