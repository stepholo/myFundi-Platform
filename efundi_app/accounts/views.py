"""This module contains views related to user accounts, including registration,
    login, logout, email verification, and password reset.
"""

import requests as http_requests
from django.conf import settings

from rest_framework import viewsets, status, filters, generics, serializers as drf_serializers
from rest_framework.parsers import FormParser, MultiPartParser, JSONParser
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema, inline_serializer, OpenApiResponse
from .serializers import UserSerializer, PasswordResetConfirmSerializer
from django.contrib.auth import authenticate, logout
from django.contrib.auth.models import update_last_login
from django.contrib.auth.password_validation import validate_password, ValidationError
from django.db.models import Q
from django.utils import timezone
from django.shortcuts import get_object_or_404, render
from django.views import View
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from drf_yasg.utils import swagger_auto_schema
from .models import User
from utils.permissions import EfundiPermissions
from utils.emails import send_verification_email, send_verification_email_sync, send_password_reset_email
from utils.tokens import email_verification_token_generator
from utils.sms import send_phone_verification_sms
from utils.tokens import phone_verification_code


class SwaggerLoginView(generics.GenericAPIView):
    """
    OAuth2 password-flow compatible login used by Swagger UI's Authorize dialog.

    Swagger sends credentials as form-encoded; this view also accepts JSON.
    Returns access_token / token_type so Swagger can auto-attach Bearer auth.
    """

    authentication_classes = []   # no SessionAuthentication → no CSRF enforcement
    permission_classes = [AllowAny]

    @extend_schema(
        tags=['Authentication'],
        summary='Swagger UI login (OAuth2 password flow)',
        description=(
            'Enter your eFundi **username** and **password**. '
            'Swagger UI will call this endpoint automatically when you use the '
            '`credentialsAuth` option in the Authorize dialog and will set '
            '`Authorization: Bearer <token>` on every subsequent request.\n\n'
            'The `role` field in the response tells you which tag group in '
            'Swagger applies to your account (Customer / Technician / Admin).'
        ),
        request=inline_serializer(
            name='SwaggerLoginRequest',
            fields={
                'username': drf_serializers.CharField(),
                'password': drf_serializers.CharField(),
                'grant_type': drf_serializers.CharField(
                    required=False,
                    default='password',
                    help_text='Auto-filled by Swagger UI — leave as "password".',
                ),
            },
        ),
        responses={
            200: inline_serializer(
                name='SwaggerLoginResponse',
                fields={
                    'access_token': drf_serializers.CharField(),
                    'token_type': drf_serializers.CharField(),
                    'refresh_token': drf_serializers.CharField(),
                    'role': drf_serializers.CharField(
                        help_text='Customer | Technician | Admin | Super Admin'
                    ),
                },
            ),
            401: OpenApiResponse(description='Invalid credentials'),
            403: OpenApiResponse(description='Account inactive'),
        },
        auth=[],
    )
    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {'error': 'username and password are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {'error': 'Account is inactive'},
                status=status.HTTP_403_FORBIDDEN,
            )

        update_last_login(None, user)
        refresh = RefreshToken.for_user(user)
        return Response({
            'access_token': str(refresh.access_token),
            'token_type': 'bearer',
            'refresh_token': str(refresh),
            'role': user.role,
        })


@swagger_auto_schema(tags=['Accounts'])
class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for managing user accounts, including registration and details."""
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [EfundiPermissions]
    lookup_field = 'user_id'
    search_fields = ('username', 'email', 'first_name', 'last_name', 'phone_number')
    ordering_fields = ('created_at', 'updated_at', 'last_login')
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)

    def perform_queryset(self):
        """Override to filter queryset based on user role."""
        user = self.request.user
        if user.is_authenticated and user.role == 'admin':
            return User.objects.all()
        return User.objects.filter(user_id=user.user_id)


@swagger_auto_schema(tags=['Accounts'])
class UserRegistrationView(generics.CreateAPIView):
    """API view for user registration."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        """Create a new user, send verification email, and handle invalid recipient errors."""
        import smtplib
        from django.db import transaction
        from rest_framework import serializers as drf_s
        from accounts.signals import _reg_ctx

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email_invalid = False
        _reg_ctx.sending_sync = True
        try:
            with transaction.atomic():
                user = serializer.save()
                try:
                    send_verification_email_sync(user, request)
                except smtplib.SMTPRecipientsRefused as exc:
                    for _addr, (code, _msg) in exc.recipients.items():
                        if code == 550:
                            email_invalid = True
                    raise  # rolls back the transaction
                except Exception:
                    pass  # other SMTP/network errors: user is created, email just won't arrive
        except smtplib.SMTPRecipientsRefused:
            pass  # transaction already rolled back
        finally:
            _reg_ctx.sending_sync = False

        if email_invalid:
            raise drf_s.ValidationError(
                {'email': ['This email address does not exist. Please check for typos and try again.']}
            )

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        serializer.save()


@swagger_auto_schema(tags=['Accounts'])
class UserLoginView(generics.GenericAPIView):
    """API view for user login."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        """Authenticate user and return JWT tokens."""
        username = request.data.get('username', '').strip()
        password = request.data.get('password')

        user_obj = User.objects.filter(
            Q(username__iexact=username) |
            Q(email__iexact=username)
        ).first()
        if not user_obj or not user_obj.check_password(password):
            return Response({'error': 'Invalid username or password.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user_obj.is_active:
            return Response(
                {'error': 'Email not verified. Please check your inbox for the verification link.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        update_last_login(None, user_obj)
        refresh = RefreshToken.for_user(user_obj)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'role': user_obj.role,
            'verified_email': user_obj.verified_email,
        }, status=status.HTTP_200_OK)


class GoogleLoginView(generics.GenericAPIView):
    """Verify a Google ID token and return JWT tokens for customers and technicians."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        """Validate Google credential, map it to an existing non-admin user, and issue JWT tokens."""
        credential = request.data.get('credential', '').strip()
        if not credential:
            return Response({'error': 'Google credential is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Verify with Google's tokeninfo endpoint (no extra packages needed)
        resp = http_requests.get(
            'https://oauth2.googleapis.com/tokeninfo',
            params={'id_token': credential},
            timeout=10,
        )
        if resp.status_code != 200:
            return Response({'error': 'Invalid or expired Google token.'}, status=status.HTTP_400_BAD_REQUEST)

        info = resp.json()

        # Validate the token was issued for our app
        client_id = getattr(settings, 'GOOGLE_CLIENT_ID', '')
        if client_id and info.get('aud') != client_id:
            return Response({'error': 'Google token was not issued for this app.'}, status=status.HTTP_400_BAD_REQUEST)

        email = info.get('email', '').strip()
        if not email or not info.get('email_verified'):
            return Response({'error': 'Google account email is not verified.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if not user:
            return Response(
                {'error': 'No eFundi account found for this Google email. Please register first.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if user.is_staff:
            return Response(
                {'error': 'Admin accounts must use the admin login page.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        update_last_login(None, user)
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'role': user.role,
            'verified_email': user.verified_email,
        }, status=status.HTTP_200_OK)


@swagger_auto_schema(tags=['Accounts'])
class UserLogoutView(generics.GenericAPIView):
    """API view for user logout."""
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """Logout user and end session."""
        logout(request)
        return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)


@swagger_auto_schema(tags=['Accounts'])
class EmailVerificationView(generics.GenericAPIView):
    """API view for email verification."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        """Verify email using token."""
        token = request.query_params.get('token')
        uid = request.query_params.get('uid')
        if not uid or not token:
            return Response({'error': 'Missing uid or token.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid_decoded = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=uid_decoded)
        except Exception:
            return Response({'error': 'Invalid uid.'}, status=status.HTTP_400_BAD_REQUEST)

        if not email_verification_token_generator.check_token(user, token):
            return Response({'error': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)

        user.is_active = True
        user.verified_email = True
        user.save()

        if user.role == 'Technician':
            from utils.emails import send_notification_email
            send_notification_email(
                to_email=user.email,
                subject='Your eFundi technician account is pending verification',
                template_name='emails/account_pending.html',
                context={
                    'first_name': user.first_name,
                    'verification_status': 'Pending',
                },
            )

        return Response({'message': 'Email verified successfully'}, status=status.HTTP_200_OK)


@extend_schema(
    tags=['Authentication'],
    summary='Resend email verification link',
    request=inline_serializer(
        name='ResendVerificationBody',
        fields={'email': drf_serializers.EmailField()},
    ),
    responses={
        200: inline_serializer(
            name='ResendVerificationResponse',
            fields={'message': drf_serializers.CharField()},
        ),
        400: OpenApiResponse(description='Invalid email or account already active'),
    },
    auth=[],
)
class EmailVerificationConfirmView(generics.GenericAPIView):
    """Endpoint for resending verification emails to unverified users."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        user = User.objects.filter(email=email).first()
        if user and not user.verified_email:
            send_verification_email(user, request)
            return Response(
                {'message': 'Verification email resent. Please check your inbox.'},
                status=status.HTTP_200_OK,
            )
        return Response(
            {'error': 'Invalid email or email already verified.'},
            status=status.HTTP_400_BAD_REQUEST,
        )


@extend_schema(
    tags=['Authentication'],
    summary='Request a password reset email',
    request=inline_serializer(
        name='PasswordResetRequestBody',
        fields={'email': drf_serializers.EmailField()},
    ),
    responses={200: inline_serializer(
        name='PasswordResetRequestResponse',
        fields={'message': drf_serializers.CharField()},
    )},
    auth=[],
)
class PasswordResetRequestView(generics.GenericAPIView):
    """Endpoint for initiating the password reset workflow via email."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        user = User.objects.filter(email=email).first()
        if user:
            send_password_reset_email(user, request)
        return Response(
            {'message': 'If an account with that email exists, a password reset link has been sent.'},
            status=status.HTTP_200_OK,
        )


@extend_schema(
    tags=['Authentication'],
    summary='Confirm password reset with uid, token and new password',
    methods=['GET', 'POST'],
)
class PasswordResetConfirmView(generics.GenericAPIView):
    """Endpoint that validates password reset tokens and updates the password."""
    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = PasswordResetConfirmSerializer

    def get_serializer(self, *args, **kwargs):
        """Pre-fill uid/token in serializer initial data when the user clicks the reset link."""
        kwargs.setdefault('initial', {
            'uid': self.request.query_params.get('uid', ''),
            'token': self.request.query_params.get('token', ''),
        })
        return super().get_serializer(*args, **kwargs)

    @extend_schema(
        summary='Validate password reset token (called when user clicks email link)',
        parameters=[
            drf_serializers.CharField(label='uid'),
            drf_serializers.CharField(label='token'),
        ],
        responses={
            200: inline_serializer(
                name='PasswordResetTokenValidResponse',
                fields={
                    'uid': drf_serializers.CharField(),
                    'token': drf_serializers.CharField(),
                    'message': drf_serializers.CharField(),
                },
            ),
            400: OpenApiResponse(description='Invalid or expired token'),
        },
        auth=[],
    )
    def get(self, request, *args, **kwargs):
        """Validate the password reset token and return confirmation details."""
        uid = request.query_params.get('uid')
        token = request.query_params.get('token')
        if not uid or not token:
            return Response({'error': 'Missing uid or token.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid_decoded = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=uid_decoded)
        except Exception:
            return Response({'error': 'Invalid uid.'}, status=status.HTTP_400_BAD_REQUEST)

        if not PasswordResetTokenGenerator().check_token(user, token):
            return Response({'error': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'uid': uid,
            'token': token,
            'message': 'Token is valid. Submit uid, token and new_password via POST to reset your password.',
        }, status=status.HTTP_200_OK)

    @extend_schema(
        summary='Set new password using uid and token',
        request=inline_serializer(
            name='PasswordResetConfirmBody',
            fields={
                'uid': drf_serializers.CharField(),
                'token': drf_serializers.CharField(),
                'new_password': drf_serializers.CharField(),
            },
        ),
        responses={
            200: inline_serializer(
                name='PasswordResetConfirmResponse',
                fields={'message': drf_serializers.CharField()},
            ),
            400: OpenApiResponse(description='Invalid or expired token'),
        },
        auth=[],
    )
    def post(self, request, *args, **kwargs):
        """Reset the user's password after validating the uid/token and new password."""
        data = {
            'uid': request.data.get('uid') or request.query_params.get('uid', ''),
            'token': request.data.get('token') or request.query_params.get('token', ''),
            'new_password': request.data.get('new_password', ''),
        }
        serializer = self.get_serializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        uid = serializer.validated_data['uid']
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']

        try:
            uid_decoded = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=uid_decoded)
        except Exception:
            return Response({'error': 'Invalid uid.'}, status=status.HTTP_400_BAD_REQUEST)

        if not PasswordResetTokenGenerator().check_token(user, token):
            return Response({'error': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({'message': 'Password reset successful'}, status=status.HTTP_200_OK)


@swagger_auto_schema(tags=['Accounts'])
class PhoneVerificationView(generics.GenericAPIView):
    """API view for phone number verification."""
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """Generate OTP and send SMS for phone verification."""
        phone_number = request.data.get('phone_number')
        if not phone_number:
            return Response({'error': 'Phone number is required.'}, status=status.HTTP_400_BAD_REQUEST)

        otp_code = phone_verification_code()
        send_phone_verification_sms(phone_number, otp_code)
        return Response({'message': 'OTP sent to the provided phone number.'}, status=status.HTTP_200_OK)


@swagger_auto_schema(tags=['Accounts'])
class PhoneVerificationConfirmView(generics.GenericAPIView):
    """Verify a user's phone number using a one-time SMS code."""
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """Verify phone number using OTP."""
        user = request.user
        phone_number = request.data.get('phone_number')
        otp_code = request.data.get('otp_code')
        otp_record = get_object_or_404(phone_verification_code, user=user, phone_number=phone_number, code=otp_code)

        if otp_record.is_used:
            return Response({'error': 'OTP has already been used.'}, status=status.HTTP_400_BAD_REQUEST)
        if otp_record.expires_at < timezone.now():
            return Response({'error': 'OTP has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        user.phone_number = phone_number
        user.save()
        otp_record.is_used = True
        otp_record.save()
        return Response({'message': 'Phone number verified successfully'}, status=status.HTTP_200_OK)


class PasswordResetConfirmPageView(View):
    """Browser-facing page that lets a user set a new password from the email reset link."""
    template = 'password_reset_confirm_page.html'

    def _resolve_user(self, uid, token):
        """Resolve the user from uid/token and return any validation error message."""
        if not uid or not token:
            return None, 'Missing uid or token.'
        try:
            uid_decoded = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=uid_decoded)
        except Exception:
            return None, 'This reset link is invalid.'
        if not PasswordResetTokenGenerator().check_token(user, token):
            return None, 'This reset link has expired or has already been used.'
        return user, None

    def get(self, request):
        """Render the password reset page if the reset link is valid."""
        uid = request.GET.get('uid', '')
        token = request.GET.get('token', '')
        user, error = self._resolve_user(uid, token)
        if error:
            return render(request, self.template, {'error': error})
        return render(request, self.template, {'uid': uid, 'token': token})

    def post(self, request):
        """Handle the browser form submission to set a new password."""
        uid = request.POST.get('uid', '')
        token = request.POST.get('token', '')
        new_password = request.POST.get('new_password', '')
        confirm_password = request.POST.get('confirm_password', '')

        user, error = self._resolve_user(uid, token)
        if error:
            return render(request, self.template, {'error': error})

        if new_password != confirm_password:
            return render(request, self.template, {
                'uid': uid, 'token': token,
                'form_error': 'Passwords do not match.',
            })

        try:
            validate_password(new_password, user=user)
        except ValidationError as e:
            return render(request, self.template, {
                'uid': uid, 'token': token,
                'form_error': ' '.join(e.messages),
            })

        user.set_password(new_password)
        user.save()
        return render(request, self.template, {'success': True})
