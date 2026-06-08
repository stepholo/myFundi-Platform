"""Serializers for the Technician model."""

import json
from django.http import QueryDict
from rest_framework import serializers
from .models import Technician, TechnicianSpecialization


class TechnicianSpecializationSerializer(serializers.ModelSerializer):
    """Serializer for technician specializations."""

    certificate_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = TechnicianSpecialization
        fields = (
            'id', 'technician', 'name', 'skills',
            'verification_status', 'years_of_experience', 'certificate', 'certificate_url',
            'created_at', 'updated_at',
        )
        read_only_fields = (
            'id', 'technician', 'certificate_url',
            'created_at', 'updated_at',
        )

    def get_certificate_url(self, obj):
        if obj.certificate:
            return obj.certificate.url
        return None

    def to_internal_value(self, data):
        if isinstance(data, QueryDict):
            data = data.copy()
        skills = data.get('skills')
        if isinstance(skills, str):
            try:
                data['skills'] = json.loads(skills)
            except ValueError:
                data['skills'] = [item.strip() for item in skills.split(',') if item.strip()]
        return super().to_internal_value(data)

    def validate_name(self, value):
        if not value:
            raise serializers.ValidationError('Specialization name cannot be empty.')
        return value

    def validate_skills(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError('Skills must be a list.')
        cleaned = [str(item).strip() for item in value if str(item).strip()]
        return cleaned


class TechnicianSerializer(serializers.ModelSerializer):
    """Serializer for the Technician model."""

    id = serializers.UUIDField(source='user_id.user_id', read_only=True)
    specializations = TechnicianSpecializationSerializer(many=True, read_only=True)
    verified_specializations = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Technician
        fields = (
            'id', 'user_id',
            'first_name', 'last_name', 'email', 'phone_number', 'role',
            'bio',
            'is_available', 'is_active', 'verification_status',
            'credentials', 'specializations', 'verified_specializations',
            'created_at', 'updated_at',
        )
        read_only_fields = (
            'id', 'user_id', 'is_active', 'created_at', 'updated_at',
            'specializations', 'verified_specializations',
        )

    def validate_email(self, value):
        """Validate that the email is unique across technicians."""
        if Technician.objects.filter(email=value).exclude(
            pk=getattr(self.instance, 'pk', None)
        ).exists():
            raise serializers.ValidationError(
                'A technician with this email already exists.'
            )
        return value

    def validate_phone_number(self, value):
        """Validate that the phone number is unique across technicians."""
        if Technician.objects.filter(phone_number=value).exclude(
            pk=getattr(self.instance, 'pk', None)
        ).exists():
            raise serializers.ValidationError(
                'A technician with this phone number already exists.'
            )
        return value

    def validate_verification_status(self, value):
        allowed = [s[0] for s in Technician.STATUS]
        if value not in allowed:
            raise serializers.ValidationError(
                f'Verification status must be one of: {", ".join(allowed)}.'
            )
        return value

    def get_verified_specializations(self, obj):
        return TechnicianSpecializationSerializer(
            obj.specializations.filter(verification_status='Verified'),
            many=True,
            context=self.context,
        ).data

    def validate(self, attrs):
        """
        is_available may only be True when is_active is True.
        is_active is auto-derived from verification_status in the model's save(),
        but we surface a clear error here before the save happens.
        """
        instance = self.instance

        # Resolve the effective is_active for this update
        verification_status = attrs.get(
            'verification_status',
            instance.verification_status if instance else 'Pending',
        )
        is_active = (verification_status == 'Verified')

        is_available = attrs.get(
            'is_available',
            instance.is_available if instance else False,
        )

        if is_available and not is_active:
            raise serializers.ValidationError({
                'is_available': (
                    'A technician can only be set as available after '
                    'their verification status is Verified.'
                )
            })

        return attrs
