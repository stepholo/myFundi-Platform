"""Serializers for bookings, broadcasts, technician locations, and service pricing."""

from decimal import Decimal

from rest_framework import serializers

from .models import Booking, BookingBroadcast, ServicePriceList, TechnicianLocation


# ---------------------------------------------------------------------------
# Service Price List
# ---------------------------------------------------------------------------

class ServicePriceListSerializer(serializers.ModelSerializer):
    """Public read-only view of a service/fault price entry."""

    worker_pct = serializers.DecimalField(
        max_digits=5, decimal_places=2, read_only=True,
        help_text='Technician share as % of the company bill.',
    )

    class Meta:
        model = ServicePriceList
        fields = (
            'id',
            'category',
            'fault_name',
            'company_bill_min',
            'company_bill_max',
            'worker_min',
            'worker_max',
            'company_keeps_min',
            'company_keeps_max',
            'notes',
            'worker_pct',
        )
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Booking
# ---------------------------------------------------------------------------

class BookingSerializer(serializers.ModelSerializer):
    """
    Role-aware booking serializer.

    - Customer: sees `amount` (company bill) and `price_range`; never sees
      `worker_amount` or `company_keeps`.
    - Technician: sees `worker_amount`; `amount` is hidden.
    - Admin/Super Admin: sees all fields.

    `service_fault_id` is writable on create; all IDs and computed fields are
    read-only.
    """

    customer_id = serializers.SerializerMethodField()
    technician_id = serializers.SerializerMethodField()
    technician_name = serializers.SerializerMethodField()
    completion_duration = serializers.SerializerMethodField()
    service_fault_detail = serializers.SerializerMethodField()
    price_range = serializers.SerializerMethodField(
        help_text='Quoted price range from the selected service fault (customer-facing).',
    )
    payment_status = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = (
            'booking_id', 'customer_id', 'technician_id', 'technician_name',
            'service_category', 'service_fault', 'service_fault_detail',
            'description', 'status', 'payment_status',
            # Pricing — visibility controlled by to_representation
            'amount', 'worker_amount', 'company_keeps', 'price_range',
            'location', 'latitude', 'longitude',
            'scheduled_time', 'assigned_at', 'accepted_at', 'started_at',
            'completion_duration', 'created_at',
        )
        read_only_fields = (
            'booking_id', 'customer_id', 'technician_id', 'technician_name',
            'status', 'assigned_at', 'accepted_at', 'started_at',
            'completion_duration', 'created_at',
            'amount', 'worker_amount', 'company_keeps',
            'service_fault_detail', 'price_range', 'payment_status',
        )

    # --- computed fields ---

    def get_customer_id(self, obj):
        return str(obj.customer_id.user_id_id)

    def get_technician_id(self, obj):
        if obj.technician_id is None:
            return None
        return str(obj.technician_id.user_id_id)

    def get_technician_name(self, obj):
        if obj.technician_id is None:
            return None
        t = obj.technician_id
        return f"{t.first_name} {t.last_name}"

    def get_completion_duration(self, obj):
        if obj.status != Booking.STATUS_COMPLETED or not obj.completion_duration:
            return None
        total = int(obj.completion_duration.total_seconds())
        hours, rem = divmod(total, 3600)
        minutes = rem // 60
        return f"{hours}h {minutes}m" if hours else f"{minutes}m"

    def get_service_fault_detail(self, obj):
        """Return summary of the selected service fault for display."""
        if not obj.service_fault_id:
            return None
        f = obj.service_fault
        return {
            'id': f.id,
            'fault_name': f.fault_name,
            'company_bill_min': str(f.company_bill_min),
            'company_bill_max': str(f.company_bill_max),
            'worker_min': str(f.worker_min),
            'worker_max': str(f.worker_max),
            'notes': f.notes,
        }

    def get_payment_status(self, obj):
        """Return the most recent payment status for this booking."""
        payment = obj.payments.order_by('-created_at').first()
        if payment is None:
            return None
        return payment.payment_status

    def get_price_range(self, obj):
        """Return the company-bill range for the selected fault (for customers)."""
        if not obj.service_fault_id:
            return None
        f = obj.service_fault
        return {
            'min': str(f.company_bill_min),
            'max': str(f.company_bill_max),
            'currency': 'KES',
        }

    # --- role-based field visibility ---

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if request is None:
            return data

        user = request.user
        role = getattr(user, 'role', None)

        if role == 'Technician':
            # Technicians only see their own earnings, not the company bill
            data.pop('amount', None)
            data.pop('company_keeps', None)
            data.pop('price_range', None)
        elif role == 'Customer':
            # Customers see company bill; not the internal split details
            data.pop('worker_amount', None)
            data.pop('company_keeps', None)
        # Admin / Super Admin see everything

        return data


# ---------------------------------------------------------------------------
# Broadcast / Location (unchanged)
# ---------------------------------------------------------------------------

class BookingBroadcastSerializer(serializers.ModelSerializer):
    """Read-only view of a dispatch broadcast record."""

    technician_name = serializers.SerializerMethodField()

    class Meta:
        model = BookingBroadcast
        fields = (
            'id', 'booking_id', 'technician_id', 'technician_name',
            'status', 'sent_at', 'responded_at',
        )
        read_only_fields = fields

    def get_technician_name(self, obj):
        t = obj.technician_id
        return f"{t.first_name} {t.last_name}"


class TechnicianLocationSerializer(serializers.ModelSerializer):
    """Read serializer for technician live locations."""

    technician = serializers.StringRelatedField(source='technician_id', read_only=True)
    is_online = serializers.BooleanField(read_only=True)

    class Meta:
        model = TechnicianLocation
        fields = (
            'id', 'technician_id', 'technician',
            'latitude', 'longitude', 'updated_at', 'is_online',
        )
        read_only_fields = ('id', 'technician_id', 'updated_at', 'is_online')


class NearbyTechnicianLocationSerializer(serializers.ModelSerializer):
    """Enriched serializer for the nearby-technicians endpoint.

    Returns all fields the customer-facing map/list UI needs, including
    the technician's profile, specialisations, and profile picture.
    """

    is_online  = serializers.BooleanField(read_only=True)

    # Technician profile fields (flattened from the related Technician row)
    id         = serializers.UUIDField(source='technician_id.user_id.user_id', read_only=True)
    user_uuid  = serializers.UUIDField(source='technician_id.user_id.user_id', read_only=True)
    first_name = serializers.CharField(source='technician_id.first_name', read_only=True)
    last_name  = serializers.CharField(source='technician_id.last_name',  read_only=True)
    bio        = serializers.CharField(source='technician_id.bio', read_only=True, default='')
    years_of_experience = serializers.IntegerField(
        source='technician_id.years_of_experience', read_only=True,
    )
    verification_status = serializers.CharField(
        source='technician_id.verification_status', read_only=True,
    )
    is_available = serializers.BooleanField(
        source='technician_id.is_available', read_only=True,
    )
    profile_picture = serializers.SerializerMethodField()
    verified_specializations = serializers.SerializerMethodField()

    class Meta:
        model = TechnicianLocation
        fields = (
            'id', 'user_uuid',
            'latitude', 'longitude', 'updated_at', 'is_online',
            'first_name', 'last_name', 'bio',
            'years_of_experience', 'verification_status', 'is_available',
            'profile_picture', 'verified_specializations',
        )

    def get_profile_picture(self, obj):
        request = self.context.get('request')
        pic = obj.technician_id.user_id.profile_picture
        if not pic:
            return None
        return request.build_absolute_uri(pic.url) if request else pic.url

    def get_verified_specializations(self, obj):
        from technicians.serializers import TechnicianSpecializationSerializer
        qs = obj.technician_id.specializations.filter(verification_status='Verified')
        return TechnicianSpecializationSerializer(qs, many=True).data


class TechnicianLocationUpdateSerializer(serializers.Serializer):
    """Write serializer — only lat/lng accepted from the device."""

    latitude = serializers.DecimalField(
        max_digits=11, decimal_places=8,
        min_value=Decimal('-90'), max_value=Decimal('90'),
    )
    longitude = serializers.DecimalField(
        max_digits=11, decimal_places=8,
        min_value=Decimal('-180'), max_value=Decimal('180'),
    )

    def to_internal_value(self, data):
        """
        Accept common GPS payloads from mobile/browser APIs:
        {"latitude": ...}, {"lat": ...}, or {"coords": {"latitude": ...}}.
        """
        if hasattr(data, 'copy'):
            data = data.copy()
        else:
            data = dict(data or {})

        coords = data.get('coords')
        if isinstance(coords, dict):
            data.setdefault('latitude', coords.get('latitude'))
            data.setdefault('longitude', coords.get('longitude'))

        data.setdefault('latitude', data.get('lat'))
        data.setdefault('longitude', data.get('lng', data.get('lon')))
        return super().to_internal_value(data)
