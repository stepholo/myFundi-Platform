import pytest

from technicians.models import Technician, TechnicianSpecialization

pytestmark = pytest.mark.django_db


class TestTechnicianModel:
    def test_str_representation(self, technician_user):
        tech = technician_user.technician_profile
        assert str(tech) == f"{tech.first_name} - {tech.last_name} ({tech.email})"

    def test_profile_auto_created_via_signal(self, technician_user):
        assert hasattr(technician_user, 'technician_profile')
        assert isinstance(technician_user.technician_profile, Technician)

    def test_verified_status_activates_technician(self, technician_user):
        tech = technician_user.technician_profile
        tech.verification_status = 'Verified'
        tech.save(update_fields=['verification_status'])
        tech.refresh_from_db()
        assert tech.is_active is True

    def test_pending_status_deactivates_technician(self, technician_user):
        tech = technician_user.technician_profile
        tech.verification_status = 'Verified'
        tech.save(update_fields=['verification_status'])

        tech.verification_status = 'Pending'
        tech.save(update_fields=['verification_status'])
        tech.refresh_from_db()
        assert tech.is_active is False
        assert tech.is_available is False

    def test_rejected_status_deactivates_technician(self, technician_user):
        tech = technician_user.technician_profile
        tech.verification_status = 'Rejected'
        tech.save(update_fields=['verification_status'])
        tech.refresh_from_db()
        assert tech.is_active is False
        assert tech.is_available is False

    def test_verified_specializations_filters_by_status(self, technician_user):
        tech = technician_user.technician_profile
        TechnicianSpecialization.objects.create(
            technician=tech, name='Electrical', verification_status='Verified',
        )
        TechnicianSpecialization.objects.create(
            technician=tech, name='Plumbing', verification_status='Pending',
        )
        verified = tech.verified_specializations
        assert verified.count() == 1
        assert verified.first().name == 'Electrical'


class TestTechnicianSpecializationModel:
    def test_str_representation(self, technician_user):
        tech = technician_user.technician_profile
        spec = TechnicianSpecialization.objects.create(
            technician=tech, name='Carpentry',
        )
        assert str(spec) == f"Carpentry → {tech.first_name} {tech.last_name}"

    def test_unique_together_technician_name(self, technician_user):
        from django.db import IntegrityError
        tech = technician_user.technician_profile
        TechnicianSpecialization.objects.create(technician=tech, name='Electrical')
        with pytest.raises(IntegrityError):
            TechnicianSpecialization.objects.create(technician=tech, name='Electrical')
