import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import publicApi from '../api/publicClient'

// Public API calls — no login required
const getPaymentInfo  = (id) => publicApi.get(`/bookings/${id}/payment-info/`).then(r => r.data)
const submitPayment   = (id, phone) =>
  publicApi.post(`/bookings/${id}/pay/`, { payer_phone_number: phone })

export default function PaymentPage() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const [phone, setPhone]       = useState('')
  const [payError, setPayError] = useState('')
  const [sent, setSent]         = useState(false)

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['public-booking-payment', id],
    queryFn: () => getPaymentInfo(id),
    retry: 1,
  })

  const payMutation = useMutation({
    mutationFn: (phone) => submitPayment(id, phone),
    onSuccess: () => {
      setSent(true)
      setPayError('')
    },
    onError: (err) => {
      const d = err.response?.data
      if (!d) { setPayError('Payment failed. Please try again.'); return }
      if (typeof d === 'string') { setPayError(d); return }
      setPayError(d.detail || Object.values(d).flat()[0] || 'Payment initiation failed.')
    },
  })

  const handlePay = (e) => {
    e.preventDefault()
    setPayError('')
    const cleaned = phone.trim()
    if (!cleaned) { setPayError('Enter your M-Pesa phone number.'); return }
    payMutation.mutate(cleaned)
  }

  if (isLoading) {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
          <div style={{ fontSize: '14px', color: 'var(--muted)' }}>Loading booking details…</div>
        </div>
      </Shell>
    )
  }

  if (error || !booking) {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--white)', marginBottom: '6px' }}>
            Booking not found
          </div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '20px' }}>
            This payment link may be invalid or expired.
          </div>
          <button
            onClick={() => navigate('/')}
            style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: 'var(--volt)', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
          >
            Go Home
          </button>
        </div>
      </Shell>
    )
  }

  const isPaid   = booking.payment_status === 'Successful'
  const amount   = booking.amount
  const isCancelled = booking.status === 'cancelled'

  return (
    <Shell>
      {/* Brand header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ fontSize: '36px', marginBottom: '10px' }}>💳</div>
        <div style={{ fontFamily: 'Clash Display', fontSize: '26px', fontWeight: '700', color: 'var(--white)', marginBottom: '4px' }}>
          Complete Payment
        </div>
        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
          Booking #{booking.booking_id?.slice(-8).toUpperCase()}
        </div>
      </div>

      {/* Booking summary */}
      <div style={{
        background: 'var(--ink3)', border: '1px solid var(--border2)',
        borderRadius: '16px', padding: '20px', marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--white)', marginBottom: '3px' }}>
              {booking.service_category}
            </div>
            {booking.service_fault_detail?.fault_name && (
              <div style={{ fontSize: '13px', color: '#F97316' }}>
                🔧 {booking.service_fault_detail.fault_name}
              </div>
            )}
          </div>
          <StatusChip status={booking.status} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'DM Mono', marginBottom: '3px' }}>
              📍 Location
            </div>
            <div style={{ fontSize: '13px', color: 'var(--white)' }}>{booking.location}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'DM Mono', marginBottom: '3px' }}>
              Amount Due
            </div>
            <div style={{ fontFamily: 'Clash Display', fontSize: '22px', fontWeight: '700', color: amount ? 'var(--volt)' : 'var(--muted)' }}>
              {amount ? `KSh ${Number(amount).toLocaleString()}` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* States */}
      {isCancelled ? (
        <AlertBox icon="❌" color="rgba(239,68,68,0.08)" border="rgba(239,68,68,0.3)">
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#EF4444', marginBottom: '4px' }}>Booking Cancelled</div>
          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>This booking has been cancelled and cannot be paid.</div>
        </AlertBox>
      ) : isPaid ? (
        <AlertBox icon="✅" color="rgba(34,197,94,0.08)" border="rgba(34,197,94,0.3)">
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#22C55E', marginBottom: '4px' }}>Payment Received</div>
          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
            KSh {Number(amount).toLocaleString()} paid via M-Pesa. Thank you!
          </div>
        </AlertBox>
      ) : !amount ? (
        <AlertBox icon="⏳" color="rgba(234,179,8,0.08)" border="rgba(234,179,8,0.3)">
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#CA8A04', marginBottom: '4px' }}>Quote Pending</div>
          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
            The technician hasn't set the price yet. You'll be able to pay once the job is accepted.
          </div>
        </AlertBox>
      ) : sent ? (
        <AlertBox icon="📲" color="rgba(34,197,94,0.08)" border="rgba(34,197,94,0.3)">
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#22C55E', marginBottom: '4px' }}>M-Pesa prompt sent!</div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6' }}>
            Check your phone and enter your PIN to complete the payment of KSh {Number(amount).toLocaleString()}.
          </div>
        </AlertBox>
      ) : (
        <div style={{
          background: 'var(--ink3)', border: '1px solid var(--border2)',
          borderRadius: '16px', padding: '20px',
        }}>
          <div style={{ fontFamily: 'Clash Display', fontSize: '18px', fontWeight: '700', color: 'var(--white)', marginBottom: '4px' }}>
            Pay via M-Pesa
          </div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '18px', lineHeight: '1.6' }}>
            {booking.payment_status === 'Failed'
              ? `Previous attempt failed. Enter your Safaricom number to retry KSh ${Number(amount).toLocaleString()}.`
              : `Enter your Safaricom number to receive an M-Pesa prompt for KSh ${Number(amount).toLocaleString()}.`}
          </div>

          {payError && (
            <div style={{
              marginBottom: '14px', padding: '10px 14px', borderRadius: '8px',
              background: 'rgba(255,59,59,0.1)', border: '1px solid rgba(255,59,59,0.3)',
              color: '#EF4444', fontSize: '13px',
            }}>
              {payError}
            </div>
          )}

          <form onSubmit={handlePay}>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--muted)', marginBottom: '6px' }}>
              M-Pesa Phone Number
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0712 345 678"
                required
                style={{
                  flex: 1, borderRadius: '10px', padding: '12px 14px',
                  fontSize: '15px', outline: 'none',
                  background: 'var(--ink)', border: '1px solid var(--border2)',
                  color: 'var(--white)',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--volt)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border2)')}
              />
              <motion.button
                type="submit"
                disabled={payMutation.isPending}
                whileHover={{ translateY: -1 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  padding: '12px 20px', borderRadius: '10px', border: 'none',
                  background: 'var(--volt)', color: '#FFFFFF', fontSize: '15px',
                  fontWeight: '700', fontFamily: 'Cabinet Grotesk',
                  cursor: payMutation.isPending ? 'not-allowed' : 'pointer',
                  opacity: payMutation.isPending ? 0.6 : 1, whiteSpace: 'nowrap',
                }}
              >
                {payMutation.isPending ? 'Sending…' : '📱 Pay Now'}
              </motion.button>
            </div>
          </form>

          <div style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', marginTop: '14px' }}>
            🔒 Secured by Safaricom M-Pesa
          </div>
        </div>
      )}
    </Shell>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Shell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ width: '100%', maxWidth: '460px' }}
      >
        {children}
      </motion.div>
    </div>
  )
}

function AlertBox({ icon, color, border, children }) {
  return (
    <div style={{
      background: color, border: `1px solid ${border}`,
      borderRadius: '16px', padding: '20px',
      display: 'flex', gap: '14px', alignItems: 'flex-start',
    }}>
      <div style={{ fontSize: '24px', lineHeight: 1 }}>{icon}</div>
      <div>{children}</div>
    </div>
  )
}

function StatusChip({ status }) {
  const cfg = {
    requested:   { bg: 'rgba(99,102,241,0.1)',  color: '#818CF8', label: 'Requested' },
    broadcasted: { bg: 'rgba(234,179,8,0.1)',   color: '#CA8A04', label: 'Finding Tech' },
    assigned:    { bg: 'rgba(59,130,246,0.1)',  color: '#3B82F6', label: 'Assigned' },
    in_progress: { bg: 'rgba(249,115,22,0.1)',  color: '#F97316', label: 'In Progress' },
    completed:   { bg: 'rgba(34,197,94,0.1)',   color: '#22C55E', label: 'Completed' },
    cancelled:   { bg: 'rgba(100,116,139,0.1)', color: '#94A3B8', label: 'Cancelled' },
  }
  const c = cfg[status] || cfg.requested
  return (
    <span style={{
      padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '700',
      background: c.bg, color: c.color, whiteSpace: 'nowrap', fontFamily: 'DM Mono', flexShrink: 0,
    }}>
      {c.label}
    </span>
  )
}
