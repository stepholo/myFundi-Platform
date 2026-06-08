"""
This module defines the Technician model for the efundi_app application.
The Technician model represents a technician in the system, with fields for
name, email, phone number, and specialization.
The model also includes a string representation method for easy identification.
Date: 2024-06-01
"""

from django.db import models


class Technician(models.Model):
    """
    Represents a technician in the system.
    Fields:
        name (CharField): The name of the technician.
        email (EmailField): The email address of the technician.
        phone_number (CharField): The phone number of the technician.
        specialization (CharField): The area of specialization for the technician.

    Methods:
        __str__: Returns a string representation of the technician.
    """

    STATUS = (
        ('Pending', 'Pending'),
        ('Verified', 'Verified'),
        ('Rejected', 'Rejected'),
    )

    user_id = models.OneToOneField(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='technician_profile',
        db_column='user_id',
        editable=False,
    )
    first_name = models.CharField(
        'accounts.User.first_name',
        max_length=30
        )
    last_name = models.CharField(
        'accounts.User.last_name',
        max_length=30
        )
    email = models.EmailField(
        'accounts.User.email',
        unique=True
        )  # Ensure email is unique across technicians
    phone_number = models.CharField(
        'accounts.User.phone_number',
        max_length=10,
        unique=True
        )  # Ensure phone number is unique across technicians
    role = models.CharField(
        'accounts.User.role',
        max_length=20,
        default='Technician',
    )
    bio = models.TextField(blank=True, null=True)
    is_available = models.BooleanField(default=False)
    is_active = models.BooleanField(
        'accounts.User.is_active',
        default=False,
    )
    verification_status = models.CharField(
        max_length=20,
        default='Pending',
        choices=STATUS,
    )  # New field for verification status
    credentials = models.FileField(
        upload_to='technician_credentials/',
        blank=True,
        null=True
        )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        """
        Enforce verification → active → available cascade:
          Verified   → is_active=True  (available can be set freely)
          Pending    → is_active=False, is_available=False
          Rejected   → is_active=False, is_available=False

        Also ensures is_active and is_available are always written when
        verification_status changes, even if update_fields was passed.
        """
        if self.verification_status == 'Verified':
            self.is_active = True
        else:
            self.is_active = False
            self.is_available = False

        # When update_fields is specified, auto-include the fields we just changed
        # so callers don't have to remember to list them explicitly.
        update_fields = kwargs.get('update_fields')
        if update_fields is not None:
            uf = list(update_fields)
            for field in ('is_active', 'is_available'):
                if field not in uf:
                    uf.append(field)
            kwargs['update_fields'] = uf

        super().save(*args, **kwargs)

    def __str__(self):
        """Returns a string representation of the technician."""
        return f"{self.first_name} - {self.last_name} ({self.email})"

    @property
    def verified_specializations(self):
        """Return this technician's verified specializations."""
        return self.specializations.filter(verification_status='Verified')

    class Meta:
        verbose_name = "Technician"
        verbose_name_plural = "Technicians"
        ordering = ['-created_at']
        db_table = 'efundi_technician'
        indexes = [
            models.Index(fields=['email'], name='technician_email_idx'),
            models.Index(fields=['phone_number'], name='technician_phone_number_idx'),
        ]
        constraints = [
            models.UniqueConstraint(fields=['email'], name='unique_technician_email'),
            models.UniqueConstraint(fields=['phone_number'], name='unique_technician_phone_number'),
        ]


class TechnicianSpecialization(models.Model):
    """A technician specialization with skills, certificate, and verification status."""

    STATUS = (
        ('Pending', 'Pending'),
        ('Verified', 'Verified'),
        ('Rejected', 'Rejected'),
    )

    NAME_CHOICES = (
        ('Electrical', 'Electrical'),
        ('Plumbing', 'Plumbing'),
        ('Carpentry', 'Carpentry'),
        ('Cleaning', 'Cleaning'),
        ('Other', 'Other'),
        ('Fridge Repair', 'Fridge Repair'),
        ('Washing Machine', 'Washing Machine'),
        ('Cooker & Oven', 'Cooker & Oven'),
        ('Television', 'Television'),
        ('Security Systems', 'Security Systems'),
        ('Solar & Power', 'Solar & Power'),
        ('Small Appliances', 'Small Appliances'),
        ('Other Technical', 'Other Technical'),
    )

    technician = models.ForeignKey(
        Technician,
        on_delete=models.CASCADE,
        related_name='specializations',
        db_column='technician_id',
    )
    name = models.CharField(max_length=50, choices=NAME_CHOICES)
    skills = models.JSONField(default=list, blank=True)
    verification_status = models.CharField(
        max_length=20,
        choices=STATUS,
        default='Pending',
    )
    years_of_experience = models.PositiveIntegerField(default=0)
    certificate = models.FileField(
        upload_to='technician_certificates/',
        blank=True,
        null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} → {self.technician.first_name} {self.technician.last_name}"

    class Meta:
        verbose_name = 'Technician Specialization'
        verbose_name_plural = 'Technician Specializations'
        ordering = ['name']
        db_table = 'technician_specializations'
        unique_together = (('technician', 'name'),)
