"""Technician API views."""

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from notifications.models import Notification
from notifications.services import create_notification
from utils.emails import send_notification_email
from utils.permissions import IsAdminOrSuperAdmin, IsTechnician, IsOwnerOrAdmin
from .models import Technician, TechnicianSpecialization
from .serializers import TechnicianSerializer, TechnicianSpecializationSerializer


@extend_schema_view(
    list=extend_schema(tags=['Technician', 'Admin']),
    retrieve=extend_schema(tags=['Technician', 'Admin']),
    update=extend_schema(tags=['Technician', 'Admin']),
    partial_update=extend_schema(tags=['Technician', 'Admin']),
    destroy=extend_schema(tags=['Admin']),
)
class TechnicianViewSet(viewsets.ModelViewSet):
    """ViewSet for managing technician profiles."""

    serializer_class = TechnicianSerializer
    lookup_field = 'user_id'
    search_fields = ('first_name', 'last_name', 'email', 'phone_number', 'specializations__name')
    ordering_fields = ('created_at', 'updated_at')
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)

    def get_queryset(self):
        """Technicians see only their own profile; admins see all."""
        user = self.request.user
        qs = Technician.objects.all()
        if not user.is_authenticated:
            return qs.none()
        if user.role in ('Admin', 'Super Admin'):
            return qs
        if user.role == 'Technician':
            return qs.filter(user_id=user)
        return qs.none()

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsAdminOrSuperAdmin()]
        if self.action in ('update', 'partial_update'):
            return [IsOwnerOrAdmin()]
        if self.action in ('verify_technician', 'reject_technician',
                           'update_verification_status'):
            return [IsAdminOrSuperAdmin()]
        if self.action == 'set_availability':
            return [(IsTechnician | IsAdminOrSuperAdmin)()]
        return [(IsTechnician | IsAdminOrSuperAdmin)()]

    def create(self, request, *args, **kwargs):
        """Technician profiles are created automatically via user role signals."""
        return Response(
            {
                'detail': (
                    'Create a user through the accounts endpoint, '
                    'then set their role to Technician.'
                )
            },
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def _send_status_email(self, technician, template_name, subject):
        context = {
            'first_name': technician.first_name,
            'last_name': technician.last_name,
            'email': technician.email,
            'verification_status': technician.verification_status,
        }
        send_notification_email(
            subject=subject,
            template_name=template_name,
            context=context,
            to_email=technician.email,
        )

    @extend_schema(tags=['Admin'])
    @action(detail=True, methods=['patch'], url_path='verify')
    def verify_technician(self, request, user_id=None):
        """Mark a technician as verified (Admin only)."""
        technician = self.get_object()
        technician.verification_status = 'Verified'
        technician.is_active = True
        technician.save(update_fields=['verification_status', 'is_active', 'updated_at'])

        user = technician.user_id
        user.is_active = True
        user.is_verified = True
        user.save(update_fields=['is_active', 'is_verified', 'updated_at'])

        self._send_status_email(
            technician,
            'emails/account_verified.html',
            'Your myFundi Hub technician account has been verified',
        )
        return Response(
            {
                'message': 'Technician verified successfully.',
                'verification_status': technician.verification_status,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(tags=['Admin'])
    @action(detail=True, methods=['patch'], url_path='reject')
    def reject_technician(self, request, user_id=None):
        """Mark a technician as rejected (Admin only)."""
        technician = self.get_object()
        technician.verification_status = 'Rejected'
        technician.is_active = False
        technician.save(update_fields=['verification_status', 'is_active', 'updated_at'])

        user = technician.user_id
        user.is_active = False
        user.is_verified = False
        user.save(update_fields=['is_active', 'is_verified', 'updated_at'])

        self._send_status_email(
            technician,
            'emails/account_rejected.html',
            'Update on your myFundi Hub technician application',
        )
        return Response(
            {
                'message': 'Technician rejected successfully.',
                'verification_status': technician.verification_status,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(tags=['Technician'])
    @action(detail=True, methods=['patch'], url_path='availability')
    def set_availability(self, request, user_id=None):
        """Toggle a technician's availability (own profile or Admin)."""
        technician = self.get_object()
        if 'is_available' not in request.data:
            return Response(
                {'is_available': 'This field is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.get_serializer(
            technician,
            data={'is_available': request.data.get('is_available')},
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {
                'message': 'Availability updated successfully.',
                'is_available': serializer.instance.is_available,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(tags=['Technician', 'Admin'])
    @action(detail=True, methods=['get'], url_path='verification-status-read')
    def verification_status(self, request, user_id=None):
        """Return the technician's current verification status."""
        technician = self.get_object()
        return Response(
            {'verification_status': technician.verification_status},
            status=status.HTTP_200_OK,
        )

    @extend_schema(tags=['Admin'])
    @action(detail=True, methods=['patch'], url_path='verification-status')
    def update_verification_status(self, request, user_id=None):
        """Update a technician's verification status (Admin only)."""
        technician = self.get_object()
        verification_status = request.data.get('verification_status')
        allowed = [choice[0] for choice in Technician.STATUS]

        if verification_status not in allowed:
            return Response(
                {'verification_status': f'Must be one of: {", ".join(allowed)}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if verification_status == 'Verified':
            return self.verify_technician(request, user_id=user_id)
        if verification_status == 'Rejected':
            return self.reject_technician(request, user_id=user_id)

        technician.verification_status = 'Pending'
        technician.save(update_fields=['verification_status', 'updated_at'])
        technician.user_id.is_verified = False
        technician.user_id.save(update_fields=['is_verified', 'updated_at'])

        return Response(
            {
                'message': 'Verification status reset to Pending.',
                'verification_status': technician.verification_status,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    list=extend_schema(tags=['Technician', 'Admin']),
    retrieve=extend_schema(tags=['Technician', 'Admin']),
    create=extend_schema(tags=['Technician', 'Admin']),
    partial_update=extend_schema(tags=['Technician', 'Admin']),
    destroy=extend_schema(tags=['Technician', 'Admin']),
)
class TechnicianSpecializationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing technician specializations."""

    serializer_class = TechnicianSpecializationSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    lookup_field = 'pk'
    search_fields = ('name', 'verification_status')
    ordering_fields = ('name', 'verification_status', 'created_at')
    filter_backends = (filters.OrderingFilter,)

    def get_queryset(self):
        user = self.request.user
        technician_user_id = self.kwargs.get('user_id')
        qs = TechnicianSpecialization.objects.select_related('technician__user_id')
        if not user.is_authenticated:
            return qs.none()
        try:
            technician = Technician.objects.get(user_id__user_id=technician_user_id)
        except Technician.DoesNotExist:
            return qs.none()
        if user.role in ('Admin', 'Super Admin'):
            return qs.filter(technician=technician)
        if user.role == 'Technician' and str(user.user_id) == str(technician_user_id):
            return qs.filter(technician=technician)
        return qs.none()

    def get_permissions(self):
        if self.action in ('verify_specialization', 'reject_specialization'):
            return [IsAdminOrSuperAdmin()]
        if self.action == 'create':
            return [(IsTechnician | IsAdminOrSuperAdmin)()]
        if self.action in ('update', 'partial_update', 'destroy', 'retrieve', 'list'):
            return [IsOwnerOrAdmin()]
        return [IsOwnerOrAdmin()]

    def perform_create(self, serializer):
        technician_user_id = self.kwargs.get('user_id')
        technician = Technician.objects.get(user_id__user_id=technician_user_id)
        if (
            self.request.user.role == 'Technician'
            and str(self.request.user.user_id) != str(technician_user_id)
        ):
            raise PermissionDenied('You may only add specializations to your own profile.')

        specialization = serializer.save(technician=technician, verification_status='Pending')
        create_notification(
            technician.user_id,
            'Specialization submitted',
            f'Your {specialization.name} specialization has been submitted for admin review.',
            Notification.EVENT_SYSTEM,
        )
        send_notification_email(
            subject='Your specialization is pending review',
            template_name='emails/account_pending.html',
            context={
                'first_name': technician.first_name,
                'verification_status': specialization.verification_status,
            },
            to_email=technician.email,
        )

    def update(self, request, *args, **kwargs):
        if 'verification_status' in request.data and request.user.role not in ('Admin', 'Super Admin'):
            raise PermissionDenied('Only admins may update specialization verification status.')
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if 'verification_status' in request.data and request.user.role not in ('Admin', 'Super Admin'):
            raise PermissionDenied('Only admins may update specialization verification status.')
        return super().partial_update(request, *args, **kwargs)

    def perform_update(self, serializer):
        instance = serializer.instance
        old_status = instance.verification_status
        updated = serializer.save()

        if (
            self.request.user.role == 'Technician'
            and 'certificate' in self.request.FILES
            and updated.verification_status != 'Pending'
        ):
            updated.verification_status = 'Pending'
            updated.save(update_fields=['verification_status', 'updated_at'])
            create_notification(
                updated.technician.user_id,
                'Specialization resubmitted',
                f'Your {updated.name} specialization has been resubmitted for review after a certificate update.',
                Notification.EVENT_SYSTEM,
            )

        if (
            self.request.user.role in ('Admin', 'Super Admin')
            and updated.verification_status != old_status
        ):
            self._send_specialization_status_email(updated)

    @extend_schema(tags=['Admin'])
    @action(detail=True, methods=['patch'], url_path='verify')
    def verify_specialization(self, request, user_id=None, pk=None):
        specialization = self.get_object()
        specialization.verification_status = 'Verified'
        specialization.save(update_fields=['verification_status', 'updated_at'])
        self._send_specialization_status_email(specialization)
        return Response(
            {
                'message': 'Specialization verified successfully.',
                'verification_status': specialization.verification_status,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(tags=['Admin'])
    @action(detail=True, methods=['patch'], url_path='reject')
    def reject_specialization(self, request, user_id=None, pk=None):
        specialization = self.get_object()
        specialization.verification_status = 'Rejected'
        specialization.save(update_fields=['verification_status', 'updated_at'])
        self._send_specialization_status_email(specialization)
        return Response(
            {
                'message': 'Specialization rejected successfully.',
                'verification_status': specialization.verification_status,
            },
            status=status.HTTP_200_OK,
        )

    def _send_specialization_status_email(self, specialization):
        templates = {
            'Verified': (
                'emails/account_verified.html',
                'Your myFundi Hub specialization has been verified',
            ),
            'Rejected': (
                'emails/account_rejected.html',
                'Update on your myFundi Hub technician specialization',
            ),
        }
        if specialization.verification_status not in templates:
            return

        template_name, subject = templates[specialization.verification_status]
        send_notification_email(
            subject=subject,
            template_name=template_name,
            context={
                'first_name': specialization.technician.first_name,
                'last_name': specialization.technician.last_name,
                'email': specialization.technician.email,
                'verification_status': specialization.verification_status,
            },
            to_email=specialization.technician.email,
        )
        create_notification(
            specialization.technician.user_id,
            f'{specialization.name} specialization {specialization.verification_status.lower()}',
            f'Your {specialization.name} specialization has been {specialization.verification_status.lower()}.',
            Notification.EVENT_SYSTEM,
        )
