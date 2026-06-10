"""PDF generation utilities for booking quotations and invoices."""

from decimal import Decimal
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# Brand colours
_BRAND_GREEN = colors.HexColor('#1B5E20')
_BRAND_LIGHT = colors.HexColor('#E8F5E9')
_GREY = colors.HexColor('#616161')
_DARK = colors.HexColor('#212121')

# Diagnostic / site-assessment fee range shown on every quotation
_SITE_ASSESSMENT_MIN = Decimal('500')
_SITE_ASSESSMENT_MAX = Decimal('1500')


def _styles():
    base = getSampleStyleSheet()
    return {
        'h1': ParagraphStyle(
            'h1', parent=base['Heading1'],
            fontSize=20, textColor=_BRAND_GREEN, spaceAfter=2 * mm,
        ),
        'h2': ParagraphStyle(
            'h2', parent=base['Heading2'],
            fontSize=13, textColor=_BRAND_GREEN, spaceAfter=1 * mm,
        ),
        'body': ParagraphStyle(
            'body', parent=base['Normal'],
            fontSize=10, textColor=_DARK, leading=14,
        ),
        'small': ParagraphStyle(
            'small', parent=base['Normal'],
            fontSize=8, textColor=_GREY, leading=11,
        ),
        'label': ParagraphStyle(
            'label', parent=base['Normal'],
            fontSize=9, textColor=_GREY,
        ),
        'bold': ParagraphStyle(
            'bold', parent=base['Normal'],
            fontSize=10, textColor=_DARK, fontName='Helvetica-Bold',
        ),
        'total': ParagraphStyle(
            'total', parent=base['Normal'],
            fontSize=12, textColor=_BRAND_GREEN, fontName='Helvetica-Bold',
        ),
    }


def _header_table(doc_title: str, ref: str, date_str: str, styles):
    """Two-column header: brand name + document type on left, ref/date on right."""
    left = [
        Paragraph('<font color="#1B5E20"><b>myFundi Hub</b></font>', styles['h1']),
        Paragraph('Professional Home & Business Services', styles['small']),
    ]
    right = [
        Paragraph(f'<b>{doc_title}</b>', styles['h2']),
        Paragraph(f'Ref: {ref}', styles['label']),
        Paragraph(f'Date: {date_str}', styles['label']),
    ]
    t = Table([[left, right]], colWidths=[90 * mm, 90 * mm])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    return t


def _info_block(label: str, value: str, styles):
    return [Paragraph(label, styles['label']), Paragraph(value or '—', styles['body'])]


def _currency(amount) -> str:
    return f"KSh {amount:,.0f}"


# ---------------------------------------------------------------------------
# Public: quotation PDF
# ---------------------------------------------------------------------------

def generate_quotation_pdf(booking) -> bytes:
    """
    Return a PDF quotation for the given booking.

    Shows site-assessment fee range plus the labor (company-bill) range for
    the selected service fault.  Sent to the customer when booking is created.
    """
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=20 * mm, bottomMargin=20 * mm,
    )
    s = _styles()
    story = []

    from django.utils.timezone import localtime
    created = localtime(booking.created_at).strftime('%d %b %Y')
    short_id = str(booking.booking_id).upper()[:8]
    ref = f"QUO-{short_id}"

    story.append(_header_table('SERVICE QUOTATION', ref, created, s))
    story.append(HRFlowable(width='100%', thickness=1, color=_BRAND_GREEN, spaceAfter=4 * mm))

    # Customer info
    customer = booking.customer_id
    story.append(Paragraph('Bill To', s['h2']))
    story.append(Paragraph(
        f"{customer.first_name} {customer.last_name}<br/>"
        f"{customer.email}<br/>{customer.phone_number}",
        s['body'],
    ))
    story.append(Spacer(1, 4 * mm))

    # Service info
    story.append(Paragraph('Service Details', s['h2']))
    fault = booking.service_fault
    fault_name = fault.fault_name if fault else '(to be confirmed after diagnosis)'
    category_display = booking.get_service_category_display()
    info_rows = [
        ['Category:', category_display],
        ['Service / Fault:', fault_name],
        ['Location:', booking.location],
        ['Scheduled:', localtime(booking.scheduled_time).strftime('%d %b %Y  %H:%M')],
    ]
    t = Table(info_rows, colWidths=[45 * mm, 135 * mm])
    t.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), _GREY),
        ('TEXTCOLOR', (1, 0), (1, -1), _DARK),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(t)
    story.append(Spacer(1, 5 * mm))

    # Cost estimate
    story.append(Paragraph('Cost Estimate', s['h2']))
    headers = ['Item', 'Min (KSh)', 'Max (KSh)']
    rows = [headers]

    assess_min = _SITE_ASSESSMENT_MIN
    assess_max = _SITE_ASSESSMENT_MAX
    rows.append(['Device / Site Assessment', f"{assess_min:,.0f}", f"{assess_max:,.0f}"])

    if fault:
        rows.append([
            f'Labor — {fault.fault_name}',
            f"{fault.company_bill_min:,.0f}",
            f"{fault.company_bill_max:,.0f}",
        ])
        total_min = assess_min + fault.company_bill_min
        total_max = assess_max + fault.company_bill_max
    else:
        rows.append(['Labor (TBD after diagnosis)', '—', '—'])
        total_min = assess_min
        total_max = assess_max

    rows.append(['', '', ''])  # spacer row
    rows.append([
        Paragraph('<b>Total Estimate</b>', s['bold']),
        Paragraph(f'<b>{total_min:,.0f}</b>', s['bold']),
        Paragraph(f'<b>{total_max:,.0f}</b>', s['bold']),
    ])

    col_w = [100 * mm, 40 * mm, 40 * mm]
    ct = Table(rows, colWidths=col_w)
    ct.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), _BRAND_GREEN),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [_BRAND_LIGHT, colors.white]),
        ('BACKGROUND', (0, -1), (-1, -1), _BRAND_LIGHT),
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, _BRAND_GREEN),
        ('LINEABOVE', (0, -1), (-1, -1), 0.5, _BRAND_GREEN),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (0, -1), 4),
    ]))
    story.append(ct)
    story.append(Spacer(1, 5 * mm))

    story.append(Paragraph(
        'Note: This is an <i>estimate only</i>. The final price will be confirmed '
        'by your assigned technician after on-site diagnosis.',
        s['small'],
    ))
    story.append(Spacer(1, 4 * mm))
    story.append(HRFlowable(width='100%', thickness=0.5, color=_GREY, spaceAfter=2 * mm))
    story.append(Paragraph(
        'myFundi Hub — Connecting you to skilled professionals | support@efundi.co.ke',
        s['small'],
    ))

    doc.build(story)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Public: invoice PDF
# ---------------------------------------------------------------------------

def generate_invoice_pdf(booking, payment_url: str) -> bytes:
    """
    Return a PDF invoice for a completed booking.

    Shows the actual confirmed amount with a payment link.
    Sent to the customer when the booking is marked complete.
    """
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=20 * mm, bottomMargin=20 * mm,
    )
    s = _styles()
    story = []

    from django.utils.timezone import localtime, now
    completed_date = localtime(now()).strftime('%d %b %Y')
    short_id = str(booking.booking_id).upper()[:8]
    ref = f"INV-{short_id}"

    story.append(_header_table('TAX INVOICE', ref, completed_date, s))
    story.append(HRFlowable(width='100%', thickness=1, color=_BRAND_GREEN, spaceAfter=4 * mm))

    # Customer info
    customer = booking.customer_id
    story.append(Paragraph('Bill To', s['h2']))
    story.append(Paragraph(
        f"{customer.first_name} {customer.last_name}<br/>"
        f"{customer.email}<br/>{customer.phone_number}",
        s['body'],
    ))
    story.append(Spacer(1, 4 * mm))

    # Technician
    tech = booking.technician_id
    if tech:
        story.append(Paragraph('Service Provided By', s['h2']))
        story.append(Paragraph(f"{tech.first_name} {tech.last_name}", s['body']))
        story.append(Spacer(1, 4 * mm))

    # Service details
    story.append(Paragraph('Service Details', s['h2']))
    fault = booking.service_fault
    fault_name = fault.fault_name if fault else booking.get_service_category_display()
    from django.utils.timezone import localtime as _lt
    sched = _lt(booking.scheduled_time).strftime('%d %b %Y  %H:%M') if booking.scheduled_time else '—'

    detail_rows = [
        ['Booking Ref:', str(booking.booking_id)],
        ['Category:', booking.get_service_category_display()],
        ['Service / Work Done:', fault_name],
        ['Location:', booking.location],
        ['Service Date:', sched],
    ]
    t = Table(detail_rows, colWidths=[50 * mm, 130 * mm])
    t.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), _GREY),
        ('TEXTCOLOR', (1, 0), (1, -1), _DARK),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(t)
    story.append(Spacer(1, 5 * mm))

    # Amount breakdown
    story.append(Paragraph('Amount Due', s['h2']))
    amount = booking.amount or Decimal('0')

    bill_rows = [
        ['Description', 'Amount (KSh)'],
        [fault_name, f"{amount:,.2f}"],
    ]
    bt = Table(bill_rows, colWidths=[130 * mm, 50 * mm])
    bt.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), _BRAND_GREEN),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [_BRAND_LIGHT, colors.white]),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (0, -1), 4),
    ]))
    story.append(bt)
    story.append(Spacer(1, 3 * mm))

    # Total row
    total_t = Table(
        [['', Paragraph(f'<b>TOTAL DUE:  KSh {amount:,.2f}</b>', s['total'])]],
        colWidths=[80 * mm, 100 * mm],
    )
    total_t.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('BACKGROUND', (0, 0), (-1, -1), _BRAND_LIGHT),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(total_t)
    story.append(Spacer(1, 6 * mm))

    # Payment link
    story.append(Paragraph('Payment', s['h2']))
    story.append(Paragraph(
        'Pay securely via M-Pesa or card by clicking the link below:',
        s['body'],
    ))
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph(
        f'<link href="{payment_url}" color="#1B5E20"><u>{payment_url}</u></link>',
        s['body'],
    ))
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph(
        'This link will open the myFundi Hub payment page where you can complete your '
        'payment using M-Pesa (STK Push) or card.',
        s['small'],
    ))
    story.append(Spacer(1, 6 * mm))

    story.append(HRFlowable(width='100%', thickness=0.5, color=_GREY, spaceAfter=2 * mm))
    story.append(Paragraph(
        'myFundi Hub — Connecting you to skilled professionals | support@efundi.co.ke',
        s['small'],
    ))

    doc.build(story)
    return buf.getvalue()
