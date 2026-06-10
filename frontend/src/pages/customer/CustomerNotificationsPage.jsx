import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { notificationsApi } from '../../api/notifications'
import usePageTitle from '../../hooks/usePageTitle'

const ACCENT = '#E8501A'

const NOTIF_TYPE_META = {
  'New Booking':         { icon: '🔔', color: ACCENT,    bg: '#FFF7ED' },
  'Booking Accepted':    { icon: '✅', color: '#16A34A', bg: '#F0FDF4' },
  'Booking Broadcasted': { icon: '📡', color: '#2563EB', bg: '#EFF6FF' },
  'Booking Completed':   { icon: '🎉', color: '#15803D', bg: '#F0FDF4' },
  'Booking Cancelled':   { icon: '❌', color: '#DC2626', bg: '#FEF2F2' },
  'Payment Successful':  { icon: '💳', color: '#16A34A', bg: '#F0FDF4' },
  'System':              { icon: 'ℹ️', color: '#64748B', bg: '#F1F5F9' },
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 1)   return 'Just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7)   return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
}

export default function CustomerNotificationsPage() {
  usePageTitle('Notifications')
  const navigate = useNavigate()
  const qc       = useQueryClient()

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn:  () => notificationsApi.list().then(r => r.data),
    refetchInterval: 30_000,
  })

  const unread = notifications.filter(n => !n.is_read)

  const markRead = (id) => {
    notificationsApi.markRead(id)
      .then(() => qc.invalidateQueries({ queryKey: ['notifications'] }))
  }

  const markAllRead = () => {
    unread.forEach(n => markRead(n.id))
  }

  return (
    <div>
      {/* Topbar */}
      <div style={{
        height: '60px', background: 'var(--ink2)', borderBottom: '1px solid var(--border2)',
        display: 'flex', alignItems: 'center', padding: '0 32px', gap: '12px',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <span style={{ fontFamily: 'Clash Display', fontSize: '17px', fontWeight: '600', color: 'var(--white)' }}>
          Notifications
        </span>
        {unread.length > 0 && (
          <span style={{
            padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
            background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}33`,
          }}>
            {unread.length} unread
          </span>
        )}
        <div style={{ flex: 1 }} />
        {unread.length > 0 && (
          <button
            onClick={markAllRead}
            style={{
              padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--border2)',
              background: 'transparent', color: 'var(--muted)', fontSize: '13px',
              fontWeight: '600', cursor: 'pointer', fontFamily: 'Cabinet Grotesk',
            }}
          >
            Mark all read
          </button>
        )}
      </div>

      <div style={{ padding: '28px 32px 60px', maxWidth: '720px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ height: '72px', background: 'var(--ink3)', borderRadius: '14px', border: '1px solid var(--border2)' }} />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div style={{
            padding: '60px 24px', textAlign: 'center',
            background: 'var(--ink3)', border: '1px dashed var(--border2)', borderRadius: '20px',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '14px' }}>🔔</div>
            <div style={{ fontSize: '17px', fontWeight: '600', color: 'var(--white)', marginBottom: '6px' }}>
              No notifications yet
            </div>
            <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
              You'll be notified when your booking status changes.
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '20px', overflow: 'hidden' }}>
            {notifications.map((n, i) => {
              const meta    = NOTIF_TYPE_META[n.event_type] || NOTIF_TYPE_META['System']
              const isUnread = !n.is_read

              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.22 }}
                  onClick={() => { if (isUnread) markRead(n.id) }}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '14px',
                    padding: '16px 20px', cursor: isUnread ? 'pointer' : 'default',
                    borderBottom: i < notifications.length - 1 ? '1px solid var(--border2)' : 'none',
                    background: isUnread ? `${ACCENT}05` : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (isUnread) e.currentTarget.style.background = `${ACCENT}0a` }}
                  onMouseLeave={e => { e.currentTarget.style.background = isUnread ? `${ACCENT}05` : 'transparent' }}
                >
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                    background: meta.bg, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '18px',
                  }}>
                    {meta.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '3px' }}>
                      <span style={{ fontSize: '15px', fontWeight: isUnread ? '700' : '500', color: 'var(--white)', lineHeight: 1.3 }}>
                        {n.title}
                      </span>
                      {isUnread && (
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: ACCENT, flexShrink: 0, display: 'inline-block' }} />
                      )}
                    </div>
                    {n.message && (
                      <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.5' }}>
                        {n.message}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: 'var(--muted2)', fontFamily: 'DM Mono', marginTop: '5px' }}>
                      {timeAgo(n.created_at)}
                    </div>
                  </div>
                  {isUnread && (
                    <button
                      onClick={e => { e.stopPropagation(); markRead(n.id) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted2)', fontSize: '16px', padding: '2px', flexShrink: 0, lineHeight: 1 }}
                      title="Mark as read"
                    >✕</button>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
