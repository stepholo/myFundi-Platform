import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { bookingsApi } from '../../api/bookings'
import { paymentsApi } from '../../api/payments'
import useAuthStore from '../../store/authStore'
import StatusBadge from '../../components/ui/StatusBadge'
import usePageTitle from '../../hooks/usePageTitle'

const STEPS       = ['requested', 'broadcasted', 'assigned', 'in_progress', 'completed']
const STEP_LABELS = ['Submitted', 'Finding Tech', 'Assigned', 'In Progress', 'Done']
const FILTERS     = ['All', 'Active', 'Completed', 'Cancelled']
const ACTIVE      = ['requested', 'broadcasted', 'assigned', 'in_progress']

function formatLocalDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  const tzOffset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
}

function filterBookings(bookings, tab) {
  if (tab === 'Active')    return bookings.filter(b => ACTIVE.includes(b.status))
  if (tab === 'Completed') return bookings.filter(b => b.status === 'completed')
  if (tab === 'Cancelled') return bookings.filter(b => b.status === 'cancelled')
  return bookings
}

export default function MyBookingsPage() {
  usePageTitle('My Bookings')
  const navigate      = useNavigate()
  const { user }      = useAuthStore()
  const queryClient   = useQueryClient()
  const [tab, setTab] = useState('All')
  const [selectedId, setSelectedId]       = useState(null)
  const [phone, setPhone]                 = useState(user?.phone_number || '')
  const [payError, setPayError]           = useState('')
  const [paySuccess, setPaySuccess]       = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [isEditing, setIsEditing]         = useState(false)
  const [editForm, setEditForm]           = useState({ location: '', scheduled_time: '', description: '' })
  const [editError, setEditError]         = useState('')
  const [page, setPage]                   = useState(1)
  const [pageSize]                        = useState(10)

  const { data: bookingPage = { results: [], count: 0, next: null, previous: null }, isLoading } = useQuery({
    queryKey: ['bookings', page],
    queryFn:  () => bookingsApi.listPaginated({ page, page_size: pageSize }).then((r) => r.data),
    keepPreviousData: true,
    refetchInterval: 30_000,
  })

  const bookings = bookingPage.results || []
  const totalPages = Math.max(1, Math.ceil((bookingPage.count || 0) / pageSize))
  const visible = useMemo(() => filterBookings(bookings, tab), [bookings, tab])

  useEffect(() => {
    setPage(1)
  }, [tab])

  useEffect(() => {
    if (visible.length === 0) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !visible.some((b) => b.booking_id === selectedId)) {
      setSelectedId(visible[0].booking_id)
    }
  }, [selectedId, visible])

  const { data: booking, isLoading: detailLoading } = useQuery({
    queryKey: ['booking', selectedId],
    queryFn:  () => bookingsApi.get(selectedId).then(r => r.data),
    enabled:  !!selectedId,
    refetchInterval: 20_000,
  })

  const payMutation = useMutation({
    mutationFn: (data) => paymentsApi.stkPush(data),
    onSuccess: () => {
      setPaySuccess(true)
      setPayError('')
      queryClient.invalidateQueries(['bookings'])
      queryClient.invalidateQueries(['booking', selectedId])
    },
    onError: (err) => {
      const d = err.response?.data
      if (!d) { setPayError('Payment failed. Please try again.'); return }
      if (typeof d === 'string') { setPayError(d); return }
      setPayError(Object.values(d).flat()[0] || 'Payment initiation failed.')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => bookingsApi.cancel(selectedId),
    onSuccess: () => {
      queryClient.invalidateQueries(['bookings'])
      queryClient.invalidateQueries(['booking', selectedId])
      setCancelConfirm(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data) => bookingsApi.update(selectedId, data),
    onSuccess: () => {
      setIsEditing(false)
      setEditError('')
      queryClient.invalidateQueries(['bookings'])
      queryClient.invalidateQueries(['booking', selectedId])
    },
    onError: (err) => {
      const d = err.response?.data
      if (!d) { setEditError('Update failed. Please try again.'); return }
      if (typeof d === 'string') { setEditError(d); return }
      setEditError(Object.values(d).flat()[0] || 'Update failed. Please try again.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => bookingsApi.destroy(selectedId),
    onSuccess: () => {
      queryClient.invalidateQueries(['bookings'])
      queryClient.invalidateQueries(['booking', selectedId])
      setDeleteConfirm(false)
      setSelectedId(null)
    },
    onError: () => {
      setEditError('Could not delete booking. Please try again.')
    },
  })

  const handlePay = (e) => {
    e.preventDefault()
    setPayError('')
    if (!phone) { setPayError('Enter your M-Pesa phone number.'); return }
    payMutation.mutate({ booking_id: selectedId, payer_phone_number: phone })
  }

  const handleSelect = (id) => {
    if (id === selectedId) return
    setSelectedId(id)
    setPaySuccess(false)
    setPayError('')
    setCancelConfirm(false)
    setDeleteConfirm(false)
    setIsEditing(false)
    setEditError('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>

      {/* Topbar */}
      <div style={{
        height: '60px', background: 'var(--ink2)', borderBottom: '1px solid var(--border2)',
        display: 'flex', alignItems: 'center', padding: '0 28px', gap: '16px',
        flexShrink: 0, position: 'sticky', top: 0, zIndex: 100,
      }}>
        <span style={{ fontFamily: 'Clash Display', fontSize: '17px', fontWeight: '600', color: 'var(--white)' }}>
          My Bookings
        </span>
        <div style={{ flex: 1 }} />
        <motion.button
          whileHover={{ translateY: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/customer/book')}
          style={{
            padding: '8px 18px', borderRadius: '8px', border: 'none',
            background: 'var(--volt)', color: '#FFFFFF', fontSize: '14px',
            fontWeight: '700', fontFamily: 'Cabinet Grotesk', cursor: 'pointer',
          }}
        >
          + Book Service
        </motion.button>
      </div>

      {/* Two-column body */}
      <div className="responsive-split" style={{ flex: 1, minHeight: 0 }}>

        {/* ── Left: booking list ─────────────────────────────────────── */}
        <div className="split-panel sidebar" style={{
          overflowY: 'auto', padding: '20px 16px',
          background: 'var(--ink)',
        }}>
          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setTab(f)}
                style={{
                  padding: '5px 13px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                  fontSize: '13px', fontWeight: '600', fontFamily: 'Cabinet Grotesk',
                  background: tab === f ? 'var(--volt)' : 'var(--ink3)',
                  color:      tab === f ? '#FFFFFF'    : 'var(--muted)',
                  transition: 'all 0.15s',
                }}
              >
                {f}
                {f === 'Active' && bookings.filter(b => ACTIVE.includes(b.status)).length > 0 && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '16px', height: '16px', borderRadius: '50%', marginLeft: '5px',
                    background: tab === f ? 'rgba(255,255,255,0.25)' : 'var(--volt)',
                    color: '#FFFFFF', fontSize: '10px', fontWeight: '700',
                  }}>
                    {bookings.filter(b => ACTIVE.includes(b.status)).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[0,1,2,3].map(i => <SkeletonRow key={i} />)}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState tab={tab} onBook={() => navigate('/customer/book')} />
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {visible.map((b, i) => (
                  <CompactRow
                    key={b.booking_id}
                    booking={b}
                    index={i}
                    isSelected={b.booking_id === selectedId}
                    onClick={() => handleSelect(b.booking_id)}
                  />
                ))}
              </div>
              {(bookingPage.count || 0) > pageSize && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                  <button
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={!bookingPage.previous}
                    style={{
                      padding: '8px 14px', borderRadius: '12px', border: '1px solid var(--border2)',
                      background: 'var(--ink3)', color: bookingPage.previous ? 'var(--white)' : 'var(--muted)',
                      cursor: bookingPage.previous ? 'pointer' : 'not-allowed',
                    }}
                  >
                    ← Previous
                  </button>
                  <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={!bookingPage.next}
                    style={{
                      padding: '8px 14px', borderRadius: '12px', border: '1px solid var(--border2)',
                      background: 'var(--ink3)', color: bookingPage.next ? 'var(--white)' : 'var(--muted)',
                      cursor: bookingPage.next ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Right: booking detail ──────────────────────────────────── */}
        <div className="split-panel" style={{ flex: 1, overflowY: 'auto', background: 'var(--ink)', padding: '24px 28px 60px' }}>
          {!selectedId ? (
            <PlaceholderEmpty />
          ) : detailLoading && !booking ? (
            <DetailSkeleton />
          ) : booking ? (
            <BookingDetail
              booking={booking}
              phone={phone}
              setPhone={setPhone}
              payError={payError}
              paySuccess={paySuccess}
              cancelConfirm={cancelConfirm}
              setCancelConfirm={setCancelConfirm}
              handlePay={handlePay}
              payMutation={payMutation}
              cancelMutation={cancelMutation}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              editForm={editForm}
              setEditForm={setEditForm}
              editError={editError}
              updateMutation={updateMutation}
              deleteMutation={deleteMutation}
              deleteConfirm={deleteConfirm}
              setDeleteConfirm={setDeleteConfirm}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

/* ── Compact list row ──────────────────────────────────────────────────── */
function CompactRow({ booking: b, index, isSelected, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={onClick}
      style={{
        background: isSelected ? 'rgba(232,80,26,0.07)' : 'var(--ink3)',
        border: `1.5px solid ${isSelected ? 'var(--volt)' : 'var(--border2)'}`,
        borderRadius: '14px', padding: '14px 14px', cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F8FAFC' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'var(--ink3)' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{
          width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
          background: catMeta(b.service_category).bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,0.12)', fontSize: '22px',
        }}>
          {catMeta(b.service_category).icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--white)' }}>
              {b.service_category}
            </div>
            <StatusBadge status={b.status} />
          </div>
          {b.service_fault_detail?.fault_name && (
            <div style={{ fontSize: '11px', color: '#F97316', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              🔧 {b.service_fault_detail.fault_name}
            </div>
          )}
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            📍 {b.location}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {b.amount ? (
              <span style={{ fontSize: '13px', fontWeight: '700', color: b.status === 'completed' ? 'var(--volt)' : 'var(--white)' }}>
                KSh {Number(b.amount).toLocaleString()}
              </span>
            ) : b.price_range ? (
              <span style={{ fontSize: '12px', color: '#22C55E', fontWeight: '600' }}>
                Est. KSh {Number(b.price_range.min).toLocaleString()} – {Number(b.price_range.max).toLocaleString()}
              </span>
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic' }}>Awaiting quote</span>
            )}
            {b.status === 'completed' && <PaymentPill status={b.payment_status || 'Pending'} />}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ── Full detail panel (right column) ─────────────────────────────────── */
function BookingDetail({
  booking, phone, setPhone, payError, paySuccess,
  cancelConfirm, setCancelConfirm, handlePay, payMutation, cancelMutation,
  isEditing, setIsEditing, editForm, setEditForm, editError,
  updateMutation, deleteMutation, deleteConfirm, setDeleteConfirm,
}) {
  const stepIdx  = STEPS.indexOf(booking.status)
  const isPaid   = booking.payment_status === 'Successful'
  const canPay   = ['assigned', 'completed'].includes(booking.status) && booking.amount && !isPaid
  const canCancel = ['requested', 'broadcasted'].includes(booking.status)
  const canEdit  = ['requested', 'broadcasted'].includes(booking.status) && booking.payment_status !== 'Successful'
  const canDelete = canEdit || booking.status === 'cancelled'
  const scheduledAt = new Date(booking.scheduled_time)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '20px' }}>
        <div style={{
          width: '54px', height: '54px', borderRadius: '14px', flexShrink: 0,
          background: catMeta(booking.service_category).bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: '28px',
        }}>
          {catMeta(booking.service_category).icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Clash Display', fontSize: '20px', fontWeight: '700', color: 'var(--white)', marginBottom: '2px' }}>
            {booking.service_category}
          </div>
          {booking.service_fault_detail?.fault_name && (
            <div style={{ fontSize: '13px', color: '#F97316', marginBottom: '2px' }}>
              🔧 {booking.service_fault_detail.fault_name}
            </div>
          )}
          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Booking #{booking.booking_id?.slice(-8)}
          </div>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      {/* Progress stepper */}
      <div style={{
        background: 'var(--ink3)', border: '1px solid var(--border2)',
        borderRadius: '16px', padding: '20px', marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: '700',
                background: i <= stepIdx ? 'var(--volt)' : 'var(--ink)',
                border: i <= stepIdx ? 'none' : '2px solid var(--border2)',
                color: i <= stepIdx ? '#FFFFFF' : 'var(--muted)',
              }}>
                {i < stepIdx ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  flex: 1, height: '3px',
                  background: i < stepIdx ? 'var(--volt)' : 'var(--border2)',
                }} />
              )}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
          {STEP_LABELS.map((l, i) => (
            <div key={l} style={{
              fontSize: '10px', fontFamily: 'DM Mono', flex: 1, textAlign: 'center',
              color: i <= stepIdx ? 'var(--volt)' : 'var(--muted)',
              fontWeight: i === stepIdx ? '700' : '400',
            }}>
              {l}
            </div>
          ))}
        </div>
      </div>

      {/* Info grid */}
      <div style={{
        background: 'var(--ink3)', border: '1px solid var(--border2)',
        borderRadius: '16px', padding: '20px', marginBottom: '16px',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
      }}>
        <InfoItem icon="📍" label="Location" value={booking.location} />
        <InfoItem
          icon="🗓" label="Scheduled"
          value={`${scheduledAt.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })} at ${scheduledAt.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}`}
        />
        {booking.amount ? (
          <InfoItem icon="💳" label="Amount Due" value={`KSh ${Number(booking.amount).toLocaleString()}`} highlight />
        ) : booking.price_range ? (
          <InfoItem icon="💰" label="Estimated Cost" value={`KSh ${Number(booking.price_range.min).toLocaleString()} – ${Number(booking.price_range.max).toLocaleString()}`} />
        ) : (
          <InfoItem icon="💳" label="Amount" value="Pending quote" />
        )}
        <InfoItem icon="📅" label="Booked On" value={new Date(booking.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })} />
      </div>

      {/* Technician card */}
      {booking.technician_name && (
        <div style={{
          background: 'var(--ink3)', border: '1px solid var(--border2)',
          borderRadius: '16px', padding: '16px 20px', marginBottom: '16px',
          display: 'flex', alignItems: 'center', gap: '14px',
        }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
            background: 'var(--volt)', color: '#FFFFFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '15px', fontWeight: '700',
          }}>
            {booking.technician_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--white)', marginBottom: '2px' }}>
              {booking.technician_name}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Assigned technician</div>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--volt)', fontFamily: 'DM Mono' }}>Verified ✓</div>
        </div>
      )}

      {(canEdit || canDelete) && !isEditing && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
          {canEdit && (
            <button
              onClick={() => {
                setEditForm({
                  location: booking.location || '',
                  scheduled_time: formatLocalDateTime(booking.scheduled_time),
                  description: booking.description || '',
                })
                setEditError('')
                setIsEditing(true)
              }}
              style={{ flex: 1, minWidth: '160px', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border2)', background: 'var(--ink3)', color: 'var(--white)', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
            >
              ✏️ Edit booking
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => setDeleteConfirm(true)}
              style={{ flex: 1, minWidth: '160px', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: 'var(--red)', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
            >
              🗑️ Delete booking
            </button>
          )}
        </div>
      )}

      {isEditing && (
        <div style={{ background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '16px', padding: '18px', marginBottom: '16px' }}>
          <div style={{ display: 'grid', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'DM Mono' }}>Location</label>
              <input
                value={editForm.location}
                onChange={(e) => setEditForm(f => ({ ...f, location: e.target.value }))}
                required
                style={{ width: '100%', borderRadius: '12px', padding: '12px 14px', background: 'var(--ink2)', border: '1px solid var(--border2)', color: 'var(--white)', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'DM Mono' }}>Scheduled time</label>
              <input
                type="datetime-local"
                value={editForm.scheduled_time}
                onChange={(e) => setEditForm(f => ({ ...f, scheduled_time: e.target.value }))}
                required
                style={{ width: '100%', borderRadius: '12px', padding: '12px 14px', background: 'var(--ink2)', border: '1px solid var(--border2)', color: 'var(--white)', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'DM Mono' }}>Notes</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                rows={4}
                style={{ width: '100%', borderRadius: '12px', padding: '12px 14px', background: 'var(--ink2)', border: '1px solid var(--border2)', color: 'var(--white)', fontSize: '14px', resize: 'vertical' }}
              />
            </div>
            {editError && (
              <div style={{ padding: '10px 12px', borderRadius: '12px', background: 'rgba(255,59,59,0.1)', border: '1px solid rgba(255,59,59,0.3)', color: 'var(--red)', fontSize: '13px' }}>
                {editError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                style={{ padding: '11px 16px', borderRadius: '12px', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--muted)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => updateMutation.mutate(editForm)}
                disabled={updateMutation.isPending}
                style={{ padding: '11px 16px', borderRadius: '12px', border: 'none', background: 'var(--volt)', color: 'var(--ink)', fontSize: '13px', fontWeight: '700', cursor: updateMutation.isPending ? 'not-allowed' : 'pointer', opacity: updateMutation.isPending ? 0.7 : 1 }}
              >
                {updateMutation.isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '16px', padding: '18px', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--white)', marginBottom: '8px' }}>Delete this booking?</div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '12px' }}>This action will permanently remove the booking.</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setDeleteConfirm(false)}
              style={{ padding: '11px 16px', borderRadius: '12px', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--muted)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
            >
              Keep booking
            </button>
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              style={{ padding: '11px 16px', borderRadius: '12px', border: 'none', background: '#EF4444', color: 'white', fontSize: '13px', fontWeight: '700', cursor: deleteMutation.isPending ? 'not-allowed' : 'pointer', opacity: deleteMutation.isPending ? 0.7 : 1 }}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete booking'}
            </button>
          </div>
        </div>
      )}

      {/* Job location card — static coordinates for in_progress and completed */}
      {['in_progress', 'completed'].includes(booking.status) && (
        <div style={{
          background: 'var(--ink3)', border: '1px solid var(--border2)',
          borderRadius: '16px', padding: '16px 20px', marginBottom: '16px',
        }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--white)', marginBottom: '12px' }}>
            Job Location
          </div>
          <div style={{
            height: '76px', borderRadius: '10px', marginBottom: '12px',
            background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
            border: '1px solid #BFDBFE',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
          }}>
            <span style={{ fontSize: '20px' }}>📍</span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#1D4ED8' }}>{booking.location}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ background: 'var(--ink)', borderRadius: '8px', padding: '8px 12px' }}>
              <div style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '3px' }}>Latitude</div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--white)', fontFamily: 'DM Mono' }}>{Number(booking.latitude).toFixed(5)}</div>
            </div>
            <div style={{ background: 'var(--ink)', borderRadius: '8px', padding: '8px 12px' }}>
              <div style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '3px' }}>Longitude</div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--white)', fontFamily: 'DM Mono' }}>{Number(booking.longitude).toFixed(5)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Payment status card (completed bookings) */}
      {booking.status === 'completed' && booking.amount && (
        <div style={{
          background: 'var(--ink3)', border: `1px solid ${isPaid ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.2)'}`,
          borderRadius: '16px', padding: '16px 20px', marginBottom: '16px',
          display: 'flex', alignItems: 'center', gap: '14px',
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
            background: isPaid ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
          }}>
            {isPaid ? '✅' : '💳'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--white)', marginBottom: '2px' }}>
              {isPaid ? 'Payment Received' : booking.payment_status === 'Processing' ? 'Payment Processing' : 'Payment Pending'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
              {isPaid
                ? `KSh ${Number(booking.amount).toLocaleString()} paid via M-Pesa`
                : `KSh ${Number(booking.amount).toLocaleString()} — not yet received`}
            </div>
          </div>
          <PaymentStatusBadge status={booking.payment_status} />
        </div>
      )}

      {/* M-Pesa payment form */}
      {canPay && !paySuccess && (
        <div style={{
          background: '#FFF7ED', border: '1px solid #FED7AA',
          borderRadius: '16px', padding: '20px', marginBottom: '16px',
        }}>
          <div style={{ fontFamily: 'Clash Display', fontSize: '16px', fontWeight: '700', color: 'var(--volt)', marginBottom: '4px' }}>
            {booking.status === 'completed' ? 'Complete Your Payment' : 'Ready to Pay'}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px', lineHeight: '1.6' }}>
            {booking.payment_status === 'Failed'
              ? 'Previous attempt failed. Enter your Safaricom number to retry.'
              : `Enter your Safaricom number for an M-Pesa prompt of KSh ${Number(booking.amount).toLocaleString()}.`}
          </div>

          {payError && (
            <div style={{
              marginBottom: '12px', padding: '10px 14px', borderRadius: '8px',
              background: 'rgba(255,59,59,0.1)', border: '1px solid rgba(255,59,59,0.3)',
              color: 'var(--red)', fontSize: '13px',
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
                placeholder="0712345678"
                required
                style={{
                  flex: 1, borderRadius: '10px', padding: '11px 14px',
                  fontSize: '14px', outline: 'none',
                  background: 'var(--ink3)', border: '1px solid var(--border2)',
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
                  padding: '11px 16px', borderRadius: '10px', border: 'none',
                  background: 'var(--volt)', color: '#FFFFFF', fontSize: '14px',
                  fontWeight: '700', fontFamily: 'Cabinet Grotesk',
                  cursor: payMutation.isPending ? 'not-allowed' : 'pointer',
                  opacity: payMutation.isPending ? 0.6 : 1, whiteSpace: 'nowrap',
                }}
              >
                {payMutation.isPending ? 'Sending…' : '📱 Pay Now'}
              </motion.button>
            </div>
          </form>
        </div>
      )}

      {/* STK push sent confirmation */}
      {paySuccess && (
        <div style={{
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: '16px', padding: '24px', marginBottom: '16px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>📲</div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#22C55E', marginBottom: '6px' }}>M-Pesa prompt sent!</div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6' }}>
            Check your phone for the Safaricom STK push and enter your PIN to complete payment.
          </div>
        </div>
      )}

      {/* Cancel */}
      {canCancel && (
        !cancelConfirm ? (
          <button
            onClick={() => setCancelConfirm(true)}
            style={{
              background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px',
              color: 'var(--red)', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
              padding: '10px 16px', width: '100%', fontFamily: 'Cabinet Grotesk',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--red)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)')}
          >
            Cancel Booking
          </button>
        ) : (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '14px', padding: '18px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--white)', marginBottom: '6px' }}>
              Cancel this booking?
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '14px' }}>
              This cannot be undone. A technician may already be on their way.
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                onClick={() => setCancelConfirm(false)}
                style={{
                  padding: '9px 18px', borderRadius: '8px', border: '1px solid var(--border2)',
                  background: 'transparent', color: 'var(--muted)', fontSize: '14px',
                  fontWeight: '600', fontFamily: 'Cabinet Grotesk', cursor: 'pointer',
                }}
              >
                Keep Booking
              </button>
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                style={{
                  padding: '9px 18px', borderRadius: '8px', border: 'none',
                  background: '#EF4444', color: 'white', fontSize: '14px', fontWeight: '700',
                  fontFamily: 'Cabinet Grotesk',
                  cursor: cancelMutation.isPending ? 'not-allowed' : 'pointer',
                  opacity: cancelMutation.isPending ? 0.7 : 1,
                }}
              >
                {cancelMutation.isPending ? 'Cancelling…' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        )
      )}
    </div>
  )
}

/* ── Helpers ──────────────────────────────────────────────────────────── */
function InfoItem({ icon, label, value, highlight }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'DM Mono', marginBottom: '5px' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '14px', fontWeight: '600', color: highlight ? 'var(--volt)' : 'var(--white)', lineHeight: '1.4' }}>
        {value}
      </div>
    </div>
  )
}

function PaymentStatusBadge({ status }) {
  if (!status) return null
  const cfg = {
    Successful: { bg: 'rgba(22,163,74,0.1)',   border: 'rgba(22,163,74,0.3)',   color: '#16A34A', label: 'Paid' },
    Processing: { bg: 'rgba(37,99,235,0.1)',   border: 'rgba(37,99,235,0.3)',   color: '#2563EB', label: 'Processing' },
    Pending:    { bg: 'rgba(234,179,8,0.1)',   border: 'rgba(234,179,8,0.3)',   color: '#CA8A04', label: 'Unpaid' },
    Failed:     { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)',   color: '#DC2626', label: 'Failed' },
    Cancelled:  { bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)', color: '#64748B', label: 'Cancelled' },
  }
  const c = cfg[status] || cfg.Pending
  return (
    <span style={{
      padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '700',
      background: c.bg, border: `1px solid ${c.border}`, color: c.color, whiteSpace: 'nowrap',
    }}>
      {c.label}
    </span>
  )
}

function PaymentPill({ status }) {
  const cfg = {
    Successful: { color: '#16A34A', bg: 'rgba(22,163,74,0.1)',   border: 'rgba(22,163,74,0.3)',   label: '✓ Paid' },
    Processing: { color: '#2563EB', bg: 'rgba(37,99,235,0.1)',   border: 'rgba(37,99,235,0.3)',   label: '⏳ Processing' },
    Pending:    { color: '#CA8A04', bg: 'rgba(234,179,8,0.1)',   border: 'rgba(234,179,8,0.3)',   label: '⚠ Unpaid' },
    Failed:     { color: '#DC2626', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)',   label: '✕ Pay Failed' },
    Cancelled:  { color: '#64748B', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)', label: 'Cancelled' },
  }
  const c = cfg[status] || cfg.Pending
  return (
    <span style={{
      fontSize: '11px', fontWeight: '700', padding: '2px 9px', borderRadius: '10px',
      background: c.bg, border: `1px solid ${c.border}`, color: c.color,
    }}>
      {c.label}
    </span>
  )
}

function EmptyState({ tab, onBook }) {
  const msgs = {
    All:       { icon: '📋', title: 'No bookings yet',   sub: 'Your bookings will appear here once you request a service.' },
    Active:    { icon: '⚡', title: 'No active jobs',    sub: 'Book a service and we will find a nearby technician.' },
    Completed: { icon: '✅', title: 'No completed jobs', sub: 'Completed jobs appear here once a technician finishes.' },
    Cancelled: { icon: '❌', title: 'Nothing cancelled', sub: 'You have not cancelled any bookings.' },
  }
  const m = msgs[tab] || msgs.All
  return (
    <div style={{ textAlign: 'center', padding: '48px 16px' }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>{m.icon}</div>
      <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--white)', marginBottom: '6px' }}>{m.title}</div>
      <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '20px', lineHeight: '1.6' }}>{m.sub}</div>
      {(tab === 'All' || tab === 'Active') && (
        <button
          onClick={onBook}
          style={{
            padding: '10px 22px', borderRadius: '8px', border: 'none',
            background: 'var(--volt)', color: '#FFFFFF', fontSize: '14px',
            fontWeight: '700', fontFamily: 'Cabinet Grotesk', cursor: 'pointer',
          }}
        >
          Book a Service →
        </button>
      )}
    </div>
  )
}

function PlaceholderEmpty() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)' }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
      <div style={{ fontSize: '15px' }}>Select a booking to view details</div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div style={{
      background: 'var(--ink3)', border: '1px solid var(--border2)',
      borderRadius: '14px', padding: '14px 14px', display: 'flex', gap: '12px',
    }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--ink)', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: '13px', width: '45%', borderRadius: '5px', background: 'var(--ink)', marginBottom: '8px' }} />
        <div style={{ height: '11px', width: '70%', borderRadius: '4px', background: 'var(--ink)' }} />
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {[80, 120, 100, 80].map((h, i) => (
        <div key={i} style={{ height: `${h}px`, background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '16px' }} />
      ))}
    </div>
  )
}

const CAT_META = {
  'Electrical':       { icon: '⚡', bg: 'linear-gradient(135deg,#FEF9C3,#FDE68A)', color: '#D97706' },
  'Plumbing':         { icon: '🔧', bg: 'linear-gradient(135deg,#EFF6FF,#BFDBFE)', color: '#2563EB' },
  'Carpentry':        { icon: '🪚', bg: 'linear-gradient(135deg,#F0FDF4,#BBF7D0)', color: '#16A34A' },
  'Cleaning':         { icon: '🧹', bg: 'linear-gradient(135deg,#FAF5FF,#E9D5FF)', color: '#9333EA' },
  'Fridge Repair':    { icon: '❄️', bg: 'linear-gradient(135deg,#EFF6FF,#BAE6FD)', color: '#0284C7' },
  'Washing Machine':  { icon: '🫧', bg: 'linear-gradient(135deg,#F0F9FF,#E0F2FE)', color: '#0369A1' },
  'Cooker & Oven':    { icon: '🔥', bg: 'linear-gradient(135deg,#FFF7ED,#FED7AA)', color: '#EA580C' },
  'Television':       { icon: '📺', bg: 'linear-gradient(135deg,#F5F3FF,#DDD6FE)', color: '#7C3AED' },
  'Security Systems': { icon: '🔒', bg: 'linear-gradient(135deg,#FEF2F2,#FECACA)', color: '#DC2626' },
  'Solar & Power':    { icon: '☀️', bg: 'linear-gradient(135deg,#FFFBEB,#FDE68A)', color: '#D97706' },
  'Small Appliances': { icon: '🔌', bg: 'linear-gradient(135deg,#F0FDF4,#D1FAE5)', color: '#059669' },
  'Other Technical':  { icon: '🛠️', bg: 'linear-gradient(135deg,#F8FAFC,#E2E8F0)', color: '#475569' },
  'Other':            { icon: '📋', bg: 'linear-gradient(135deg,#FFF7ED,#FED7AA)', color: '#E8501A' },
}
function catMeta(cat) { return CAT_META[cat] ?? CAT_META['Other'] }
