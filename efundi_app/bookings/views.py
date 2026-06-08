"""Booking, service pricing, and location API views."""

from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.core.cache import cache
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from notifications.models import Notification
from notifications.services import create_notification
from utils.permissions import (
    IsAdminOrSuperAdmin,
    IsAuthenticated,
    IsCustomer,
    IsTechnician,
    IsVerifiedTechnician,
)
from .dispatch import _haversine_km, accept_booking, broadcast_booking, decline_booking
from .models import Booking, BookingBroadcast, ServicePriceList, TechnicianLocation
from .serializers import (
    BookingBroadcastSerializer,
    BookingSerializer,
    NearbyTechnicianLocationSerializer,
    ServicePriceListSerializer,
    TechnicianLocationSerializer,
    TechnicianLocationUpdateSerializer,
)


# ---------------------------------------------------------------------------
# Service Price List (read-only, public — used for booking dropdown)
# ---------------------------------------------------------------------------

@extend_schema_view(
    list=extend_schema(
        tags=['Customer', 'Technician', 'Admin'],
        summary='List service/fault items for booking dropdown',
        description=(
            'Returns all active service/fault entries with their price ranges. '
            'Filter by `category` query param to get faults for a given specialization. '
            'Customers use this to populate the "kind of service" dropdown when booking.'
        ),
    ),
    retrieve=extend_schema(tags=['Customer', 'Technician', 'Admin']),
)
class ServicePriceListViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only price list — used to populate service/fault dropdowns."""

    serializer_class = ServicePriceListSerializer
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ('fault_name', 'category')
    ordering_fields = ('category', 'fault_name', 'company_bill_min')

    def get_queryset(self):
        qs = ServicePriceList.objects.filter(is_active=True)
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category__iexact=category)
        return qs

    def get_permissions(self):
        return [IsAuthenticated()]


# ---------------------------------------------------------------------------
# Booking
# ---------------------------------------------------------------------------

class BookingPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


@extend_schema_view(
    list=extend_schema(tags=['Customer', 'Technician', 'Admin']),
    retrieve=extend_schema(tags=['Customer', 'Technician', 'Admin']),
    create=extend_schema(
        tags=['Customer'],
        summary='Post a service request',
        description=(
            'Customer posts a job request specifying service_category and optionally '
            'service_fault (FK to ServicePriceList). '
            'A PDF quotation is emailed to the customer on creation. '
            'The system will broadcast the request to nearby qualified technicians.'
        ),
    ),
    update=extend_schema(tags=['Customer', 'Admin']),
    partial_update=extend_schema(tags=['Customer', 'Admin']),
    destroy=extend_schema(tags=['Customer', 'Admin']),
)
class BookingViewSet(viewsets.ModelViewSet):
    """ViewSet for managing bookings."""

    serializer_class = BookingSerializer
    pagination_class = BookingPagination
    search_fields = (
        'status',
        'customer_id__first_name', 'customer_id__last_name',
        'technician_id__first_name', 'technician_id__last_name',
        'service_category',
    )
    ordering_fields = ('created_at', 'scheduled_time', 'amount', 'status')
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)

    def get_queryset(self):
        """Filter by role — admin all, customer own, technician assigned/broadcasted."""
        from django.db.models import Q
        user = self.request.user
        qs = Booking.objects.select_related(
            'customer_id', 'technician_id', 'service_fault',
        )
        if not user.is_authenticated:
            return qs.none()
        if user.role in ('Admin', 'Super Admin'):
            return qs
        if user.role == 'Customer':
            return qs.filter(customer_id__user_id=user)
        if user.role == 'Technician':
            try:
                tech = user.technician_profile
            except Exception:
                return qs.none()
            return qs.filter(
                Q(technician_id__user_id=user) |
                Q(
                    status=Booking.STATUS_BROADCASTED,
                    broadcasts__technician_id=tech,
                    broadcasts__status=BookingBroadcast.STATUS_SENT,
                )
            ).distinct()
        return qs.none()

    def get_permissions(self):
        if self.action == 'create':
            return [IsCustomer()]
        if self.action in ('accept', 'decline'):
            return [IsVerifiedTechnician()]
        if self.action in ('start', 'complete'):
            return [(IsVerifiedTechnician | IsAdminOrSuperAdmin)()]
        if self.action in ('reject',):
            return [IsAdminOrSuperAdmin()]
        if self.action in ('update', 'partial_update', 'destroy'):
            return [(IsCustomer | IsAdminOrSuperAdmin)()]
        if self.action == 'cancel':
            return [(IsCustomer | IsTechnician | IsAdminOrSuperAdmin)()]
        if self.action in ('payment_info', 'pay'):
            from rest_framework.permissions import AllowAny
            return [AllowAny()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        """Create booking for the authenticated customer, broadcast it, then send quotation."""
        from customers.models import Client
        from rest_framework.exceptions import ValidationError

        user = self.request.user
        client, _ = Client.objects.get_or_create(
            user_id=user,
            defaults={
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'phone_number': user.phone_number,
                'role': user.role,
            },
        )

        if user.role != 'Customer':
            raise ValidationError(
                {'detail': 'Only users with the Customer role can create bookings.'}
            )

        booking = serializer.save(
            customer_id=client,
            status=Booking.STATUS_REQUESTED,
        )
        broadcast_booking(booking)

        # Send quotation email (non-blocking — failure is logged, not raised)
        from .email_utils import send_quotation_email
        send_quotation_email(booking)

    def _assert_customer_booking_editable(self, booking):
        from payments.models import Payment

        if booking.status not in (Booking.STATUS_REQUESTED, Booking.STATUS_BROADCASTED):
            raise ValidationError(
                {'detail': 'Only bookings that are still pending or broadcasted may be edited.'}
            )

        latest_payment = booking.payments.order_by('-created_at').first()
        if latest_payment and latest_payment.payment_status == Payment.STATUS_SUCCESSFUL:
            raise ValidationError(
                {'detail': 'Cannot edit a booking that already has a completed payment.'}
            )

    def _assert_customer_booking_deletable(self, booking):
        if booking.status not in (
            Booking.STATUS_REQUESTED,
            Booking.STATUS_BROADCASTED,
            Booking.STATUS_CANCELLED,
        ):
            raise ValidationError(
                {'detail': 'Only pending, broadcasted, or cancelled bookings may be deleted.'}
            )

    def perform_update(self, serializer):
        """Validate customer edits and update the booking record."""
        if self.request.user.role == 'Customer':
            self._assert_customer_booking_editable(serializer.instance)
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        """Enforce deletion rules before removing a booking."""
        if request.user.role == 'Customer':
            self._assert_customer_booking_deletable(self.get_object())
        return super().destroy(request, *args, **kwargs)

    def _set_status(self, booking, new_status, user, event_type, title, message):
        """Update booking status and notify the user of the change."""
        booking.status = new_status
        booking.save(update_fields=['status'])
        create_notification(user, title, message, event_type)
        return Response(self.get_serializer(booking).data, status=status.HTTP_200_OK)

    @extend_schema(
        tags=['Technician'],
        summary='Book a service request (set diagnosis price)',
        description=(
            'Technician books (accepts) a broadcasted service request and sets the '
            'confirmed price (company bill amount). '
            'The system automatically computes worker_amount and company_keeps based '
            'on the selected service fault pricing ratios. '
            'First-accept-wins: uses SELECT FOR UPDATE to prevent double-booking.'
        ),
    )
    @action(detail=True, methods=['patch'])
    def accept(self, request, pk=None):
        """Technician accepts an available service request and sets the confirmed price."""
        booking = self.get_object()
        try:
            technician = request.user.technician_profile
        except Exception:
            return Response(
                {'detail': 'Only technicians can accept bookings.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not technician.is_active:
            return Response(
                {'detail': 'Your account is not active. Only verified technicians can book service requests.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not technician.is_available:
            return Response(
                {'detail': 'You are not marked as available. Set your availability to On before booking.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        raw_amount = request.data.get('amount')
        if raw_amount is None:
            return Response(
                {'detail': 'You must provide the confirmed amount (company bill) to book this service.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            amount = Decimal(str(raw_amount))
            if amount <= 0:
                raise ValueError
        except (InvalidOperation, ValueError):
            return Response(
                {'detail': 'Amount must be a valid positive number.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Allow technician to update service_fault during acceptance (post-diagnosis)
        service_fault_id = request.data.get('service_fault')
        if service_fault_id:
            try:
                fault = ServicePriceList.objects.get(pk=service_fault_id, is_active=True)
                booking.service_fault = fault
            except ServicePriceList.DoesNotExist:
                return Response(
                    {'detail': 'Invalid service_fault ID.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Compute worker split
        if booking.service_fault:
            worker_amount = booking.service_fault.compute_worker_amount(amount)
        else:
            # Fallback: 35% to technician if no fault selected
            worker_amount = (amount * Decimal('0.35')).quantize(Decimal('0.01'))

        company_keeps = amount - worker_amount

        # Persist computed amounts to booking before the atomic accept
        booking.worker_amount = worker_amount
        booking.company_keeps = company_keeps
        if service_fault_id:
            booking.save(update_fields=['service_fault', 'worker_amount', 'company_keeps'])
        else:
            booking.save(update_fields=['worker_amount', 'company_keeps'])

        success, message = accept_booking(booking.pk, technician.pk, amount)
        if not success:
            return Response({'detail': message}, status=status.HTTP_409_CONFLICT)

        booking.refresh_from_db()
        return Response(self.get_serializer(booking).data, status=status.HTTP_200_OK)

    @extend_schema(tags=['Technician'])
    @action(detail=True, methods=['patch'])
    def decline(self, request, pk=None):
        """Technician explicitly declines a broadcasted booking."""
        booking = self.get_object()
        try:
            technician = request.user.technician_profile
        except Exception:
            return Response(
                {'detail': 'Only technicians can decline bookings.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not decline_booking(booking.pk, technician.pk):
            return Response(
                {'detail': 'No active broadcast found for this booking.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        create_notification(
            technician.user_id,
            'Booking Declined',
            f'You declined the {booking.service_category} booking.',
            Notification.EVENT_BOOKING_DECLINED,
        )
        return Response({'detail': 'Booking declined.'}, status=status.HTTP_200_OK)

    @extend_schema(tags=['Admin'])
    @action(detail=True, methods=['patch'])
    def reject(self, request, pk=None):
        """Reject a requested or broadcasted booking (admin action)."""
        booking = self.get_object()
        if booking.status not in (Booking.STATUS_REQUESTED, Booking.STATUS_BROADCASTED):
            return Response(
                {'detail': 'Only requested or broadcasted bookings can be rejected.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return self._set_status(
            booking, Booking.STATUS_CANCELLED,
            booking.customer_id.user_id,
            Notification.EVENT_BOOKING_REJECTED,
            'Booking rejected',
            f'Your booking for {booking.service_category} was rejected.',
        )

    @extend_schema(tags=['Technician'])
    @action(detail=True, methods=['patch'], url_path='start')
    def start(self, request, pk=None):
        """Mark an assigned booking as in progress."""
        booking = self.get_object()
        if booking.status != Booking.STATUS_ASSIGNED:
            return Response(
                {'detail': 'Only assigned bookings can be started.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        now = timezone.now()
        booking.status = Booking.STATUS_IN_PROGRESS
        booking.started_at = now
        booking.save(update_fields=['status', 'started_at'])
        create_notification(
            booking.customer_id.user_id,
            'Booking started',
            f'Your {booking.service_category} booking is now in progress.',
            Notification.EVENT_SYSTEM,
        )
        return Response(self.get_serializer(booking).data, status=status.HTTP_200_OK)

    @extend_schema(
        tags=['Technician'],
        summary='Mark booking complete and send invoice',
        description=(
            'Marks an in-progress booking as completed, computes work duration, '
            'and sends a PDF invoice with a payment link to the customer.'
        ),
    )
    @action(detail=True, methods=['patch'])
    def complete(self, request, pk=None):
        """Mark an in-progress booking as completed and send invoice to customer."""
        booking = self.get_object()
        if booking.status != Booking.STATUS_IN_PROGRESS:
            return Response(
                {'detail': 'Only in-progress bookings can be completed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        now = timezone.now()
        booking.status = Booking.STATUS_COMPLETED
        if booking.started_at:
            booking.completion_duration = now - booking.started_at
        booking.save(update_fields=['status', 'completion_duration'])

        create_notification(
            booking.customer_id.user_id,
            'Booking completed',
            f'Your {booking.service_category} booking has been completed. '
            f'Please check your email for the invoice.',
            Notification.EVENT_BOOKING_COMPLETED,
        )

        # Send invoice with payment link (non-blocking)
        from .email_utils import send_invoice_email
        send_invoice_email(booking)

        return Response(self.get_serializer(booking).data, status=status.HTTP_200_OK)

    @extend_schema(tags=['Customer', 'Technician'])
    @action(detail=True, methods=['patch'])
    def cancel(self, request, pk=None):
        """Cancel a booking that has not yet been completed."""
        booking = self.get_object()
        if booking.status == Booking.STATUS_COMPLETED:
            return Response(
                {'detail': 'Completed bookings cannot be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if booking.status in (Booking.STATUS_REQUESTED, Booking.STATUS_BROADCASTED):
            BookingBroadcast.objects.filter(
                booking_id=booking,
                status=BookingBroadcast.STATUS_SENT,
            ).update(
                status=BookingBroadcast.STATUS_EXPIRED,
                responded_at=timezone.now(),
            )

        notify_user = (
            booking.technician_id.user_id
            if booking.technician_id
            else booking.customer_id.user_id
        )
        return self._set_status(
            booking, Booking.STATUS_CANCELLED,
            notify_user,
            Notification.EVENT_BOOKING_CANCELLED,
            'Booking cancelled',
            f'A booking for {booking.service_category} was cancelled.',
        )

    @extend_schema(
        tags=['Public'],
        summary='Get booking payment info (public)',
        description='Public endpoint — no auth required. Returns just enough info to render the payment page.',
    )
    @action(detail=True, methods=['get'], url_path='payment-info')
    def payment_info(self, request, pk=None):
        """Public booking payment info — accessible via the invoice link without login."""
        try:
            booking = Booking.objects.select_related('service_fault').get(pk=pk)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        fault = booking.service_fault
        payment = booking.payments.order_by('-created_at').first()
        return Response({
            'booking_id': str(booking.booking_id),
            'service_category': booking.service_category,
            'location': booking.location,
            'status': booking.status,
            'amount': str(booking.amount) if booking.amount is not None else None,
            'payment_status': payment.payment_status if payment else None,
            'service_fault_detail': {
                'fault_name': fault.fault_name,
                'notes': fault.notes,
            } if fault else None,
        }, status=status.HTTP_200_OK)

    @extend_schema(
        tags=['Public'],
        summary='Pay booking via M-Pesa (public)',
        description='Public endpoint — no auth required. Initiates an STK Push for the invoice link.',
    )
    @action(detail=True, methods=['post'], url_path='pay')
    def pay(self, request, pk=None):
        """Public STK Push — customer pays from the invoice email link without logging in."""
        from mpesa_custom.services import IntasendClient, IntasendError
        from payments.models import Payment

        phone_number = request.data.get('payer_phone_number', '').strip()
        if not phone_number:
            return Response({'detail': 'payer_phone_number is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            booking = Booking.objects.get(pk=pk)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        if booking.amount is None:
            return Response(
                {'detail': 'This booking has no quoted amount yet. The technician must accept it first.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if booking.status == Booking.STATUS_CANCELLED:
            return Response({'detail': 'This booking has been cancelled.'}, status=status.HTTP_400_BAD_REQUEST)

        customer_email = booking.customer_id.email or ''

        try:
            intasend = IntasendClient()
            response = intasend.send_stk_push(
                phone_number=phone_number,
                amount=int(booking.amount),
                account_reference=str(booking.booking_id)[:64],
                email=customer_email,
                narrative=f'eFundi {booking.service_category}',
            )
        except IntasendError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        invoice = response.get('invoice', {})
        invoice_id = invoice.get('invoice_id', '')

        Payment.objects.create(
            booking_id=booking,
            amount=booking.amount,
            payment_method=Payment.METHOD_MPESA,
            payer_phone_number=phone_number,
            account_reference=str(booking.booking_id)[:64],
            checkout_request_id=invoice_id,
            payment_status=Payment.STATUS_PENDING,
        )

        return Response(
            {'detail': 'Payment prompt sent to your phone. Enter your M-Pesa PIN.'},
            status=status.HTTP_200_OK,
        )

    @extend_schema(tags=['Customer', 'Technician', 'Admin'])
    @action(detail=True, methods=['get'], url_path='broadcasts')
    def broadcasts(self, request, pk=None):
        """List all broadcast records for a booking."""
        booking = self.get_object()
        qs = (
            BookingBroadcast.objects
            .filter(booking_id=booking)
            .select_related('technician_id')
        )
        return Response(
            BookingBroadcastSerializer(qs, many=True).data,
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Technician Location
# ---------------------------------------------------------------------------

@extend_schema_view(
    list=extend_schema(tags=['Technician', 'Admin']),
    retrieve=extend_schema(tags=['Technician', 'Admin']),
    update=extend_schema(tags=['Technician']),
    partial_update=extend_schema(tags=['Technician']),
    destroy=extend_schema(tags=['Admin']),
)
class TechnicianLocationViewSet(viewsets.ModelViewSet):
    """ViewSet for technician live locations and nearby search."""

    queryset = TechnicianLocation.objects.select_related('technician_id')
    serializer_class = TechnicianLocationSerializer
    lookup_field = 'technician_id'
    ordering_fields = ('updated_at',)
    filter_backends = (filters.OrderingFilter,)

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'update_my_location'):
            return [(IsVerifiedTechnician | IsAdminOrSuperAdmin)()]
        if self.action == 'destroy':
            return [IsAdminOrSuperAdmin()]
        return [IsAuthenticated()]

    @extend_schema(
        tags=['Technician'],
        summary='Push current GPS location (upsert)',
        description=(
            'Call this endpoint periodically (e.g. every 15–30 s) from the technician '
            'app after reading the device GPS. '
            'Creates a location record on first call; updates it on subsequent calls. '
            'A technician is considered **online** if their location was updated within '
            'the last 5 minutes.'
        ),
        request=TechnicianLocationUpdateSerializer,
        responses={
            200: TechnicianLocationSerializer,
            201: TechnicianLocationSerializer,
        },
    )
    def create(self, request, *args, **kwargs):
        try:
            technician = request.user.technician_profile
        except Exception:
            return Response(
                {'detail': 'Only technicians can set a live location.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        write = TechnicianLocationUpdateSerializer(data=request.data)
        if not write.is_valid():
            return Response(write.errors, status=status.HTTP_400_BAD_REQUEST)

        location, created = TechnicianLocation.objects.update_or_create(
            technician_id=technician,
            defaults=write.validated_data,
        )
        return Response(
            TechnicianLocationSerializer(location).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @extend_schema(
        tags=['Technician'],
        summary='Get my current location',
        responses={200: TechnicianLocationSerializer},
    )
    @action(detail=False, methods=['get'], url_path='me')
    def update_my_location(self, request):
        """Return the authenticated technician's own location record."""
        try:
            technician = request.user.technician_profile
        except Exception:
            return Response(
                {'detail': 'No technician profile found.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            location = TechnicianLocation.objects.get(technician_id=technician)
        except TechnicianLocation.DoesNotExist:
            return Response(
                {'detail': 'No location recorded yet. Push a GPS update first.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(TechnicianLocationSerializer(location).data, status=status.HTTP_200_OK)

    @extend_schema(tags=['Customer', 'Technician', 'Admin'])
    @action(detail=False, methods=['get'], url_path='nearby')
    def nearby(self, request):
        """Find technicians within a radius in kilometers."""
        try:
            latitude = float(request.query_params['latitude'])
            longitude = float(request.query_params['longitude'])
            radius_km = float(request.query_params.get('radius_km', 5))
        except (KeyError, TypeError, ValueError):
            return Response(
                {'detail': 'Provide numeric latitude and longitude query params. radius_km defaults to 5.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cache_key = (
            f"nearby-technicians:{round(latitude, 5)}:"
            f"{round(longitude, 5)}:{round(radius_km, 2)}"
        )
        try:
            cached_data = cache.get(cache_key)
        except Exception:
            cached_data = None
        if cached_data is not None:
            return Response(cached_data, status=status.HTTP_200_OK)

        online_after = timezone.now() - timedelta(
            seconds=TechnicianLocation.NEARBY_THRESHOLD_SECONDS
        )
        locations = (
            TechnicianLocation.objects
            .filter(updated_at__gte=online_after)
            .select_related(
                'technician_id',
                'technician_id__user_id',
            )
            .prefetch_related('technician_id__specializations')
        )

        nearby_locations = []
        for location in locations:
            distance_km = _haversine_km(
                latitude,
                longitude,
                location.latitude,
                location.longitude,
            )
            if distance_km <= radius_km:
                nearby_locations.append((distance_km, location))

        nearby_locations.sort(key=lambda item: item[0])
        serializer = NearbyTechnicianLocationSerializer(
            [location for _, location in nearby_locations],
            many=True,
            context={'request': request},
        )
        data = list(serializer.data)

        for item, (distance_km, _) in zip(data, nearby_locations):
            item['distance_km'] = round(distance_km, 3)

        try:
            cache.set(cache_key, data, timeout=60)
        except Exception:
            pass

        return Response(data, status=status.HTTP_200_OK)
