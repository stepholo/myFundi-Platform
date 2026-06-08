"""Email utilities — quotation and invoice delivery for bookings."""

import logging
from email.mime.application import MIMEApplication

from django.conf import settings
from django.core.mail import EmailMessage

logger = logging.getLogger(__name__)


def _payment_url(booking) -> str:
    """Return the frontend payment URL for a booking."""
    frontend = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    return f"{frontend}/payment/{booking.booking_id}"


# ---------------------------------------------------------------------------
# Quotation — sent when booking is created
# ---------------------------------------------------------------------------

def send_quotation_email(booking) -> bool:
    """
    Send a PDF quotation to the customer.

    Called immediately after a booking is created.  Returns True on success.
    """
    try:
        from .pdf_utils import generate_quotation_pdf

        customer = booking.customer_id
        recipient = customer.email
        if not recipient:
            logger.warning("Booking %s has no customer email — skipping quotation.", booking.booking_id)
            return False

        fault = booking.service_fault
        fault_name = fault.fault_name if fault else booking.get_service_category_display()
        short_id = str(booking.booking_id).upper()[:8]

        subject = f"eFundi Service Quotation – {fault_name} [{short_id}]"
        body = (
            f"Dear {customer.first_name},\n\n"
            "Thank you for booking with eFundi. Please find attached your service "
            "quotation for the requested work.\n\n"
            "A qualified technician will be assigned shortly. The final price will "
            "be confirmed after on-site diagnosis.\n\n"
            "If you have any questions, reply to this email or contact us at "
            "support@efundi.co.ke.\n\n"
            "Best regards,\nThe eFundi Team"
        )

        pdf_bytes = generate_quotation_pdf(booking)
        filename = f"eFundi_Quotation_{short_id}.pdf"

        email = EmailMessage(
            subject=subject,
            body=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient],
        )
        email.attach(filename, pdf_bytes, 'application/pdf')
        email.send(fail_silently=False)
        logger.info("Quotation email sent for booking %s to %s", booking.booking_id, recipient)
        return True

    except Exception as exc:
        logger.exception("Failed to send quotation email for booking %s: %s", booking.booking_id, exc)
        return False


# ---------------------------------------------------------------------------
# Invoice — sent when booking is marked complete
# ---------------------------------------------------------------------------

def send_invoice_email(booking) -> bool:
    """
    Send a PDF invoice to the customer when the booking is completed.

    The invoice includes the confirmed amount and a direct payment link.
    Returns True on success.
    """
    try:
        from .pdf_utils import generate_invoice_pdf

        customer = booking.customer_id
        recipient = customer.email
        if not recipient:
            logger.warning("Booking %s has no customer email — skipping invoice.", booking.booking_id)
            return False

        fault = booking.service_fault
        fault_name = fault.fault_name if fault else booking.get_service_category_display()
        short_id = str(booking.booking_id).upper()[:8]
        payment_url = _payment_url(booking)

        subject = f"eFundi Invoice – {fault_name} [{short_id}]"
        body = (
            f"Dear {customer.first_name},\n\n"
            f"Your {fault_name} service has been completed. "
            "Please find your invoice attached.\n\n"
            f"Amount Due: KSh {booking.amount:,.2f}\n\n"
            "Pay now via the link below:\n"
            f"{payment_url}\n\n"
            "Thank you for choosing eFundi!\n\n"
            "Best regards,\nThe eFundi Team"
        )

        pdf_bytes = generate_invoice_pdf(booking, payment_url)
        filename = f"eFundi_Invoice_{short_id}.pdf"

        email = EmailMessage(
            subject=subject,
            body=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient],
        )
        email.attach(filename, pdf_bytes, 'application/pdf')
        email.send(fail_silently=False)
        logger.info("Invoice email sent for booking %s to %s", booking.booking_id, recipient)
        return True

    except Exception as exc:
        logger.exception("Failed to send invoice email for booking %s: %s", booking.booking_id, exc)
        return False
