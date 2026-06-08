import { NavLink, Outlet, useSearchParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from '../../store/authStore'
import { authApi, decodeToken } from '../../api/auth'
import UserMenu from '../ui/UserMenu'

const ACCENT = '#E8501A'
const NAVY   = '#1B2D5E'

const NAV = [
  { to: '/customer/dashboard',      icon: '⚡', label: 'Dashboard'    },
  { to: '/customer/book',           icon: '＋', label: 'Book Service' },
  { to: '/customer/bookings',       icon: '📋', label: 'My Bookings'  },
  { to: '/customer/nearby',         icon: '📍', label: 'Nearby Techs' },
  { to: '/customer/payments',       icon: '💳', label: 'Payments'     },
  { to: '/customer/notifications',  icon: '🔔', label: 'Notifications' },
]

const BOTTOM_NAV = [
  { to: '/customer/settings', icon: '⚙️', label: 'Settings' },
]

function NavItem({ to, icon, label, compact }) {
  return (
    <NavLink to={to} style={{ textDecoration: 'none' }} title={label}>
      {({ isActive }) => (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: compact ? 'center' : 'flex-start', gap: '10px',
          padding: compact ? '9px 0' : '9px 12px', borderRadius: '8px', marginBottom: '2px',
          fontSize: '16px', fontWeight: isActive ? '600' : '400',
          background: isActive ? 'rgba(255,154,60,0.18)' : 'transparent',
          color: isActive ? '#FF9A3C' : '#94A3B8',
          cursor: 'pointer', transition: 'all 0.15s',
          fontFamily: 'Cabinet Grotesk',
        }}>
          <span style={{ fontSize: '17px', width: '20px', textAlign: 'center', flexShrink: 0 }}>{icon}</span>
          {!compact && <span>{label}</span>}
        </div>
      )}
    </NavLink>
  )
}

function MobileNavItem({ to, icon, label, onClose }) {
  return (
    <NavLink to={to} style={{ textDecoration: 'none' }} onClick={onClose}>
      {({ isActive }) => (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 16px', borderRadius: '10px', marginBottom: '4px',
          fontSize: '16px', fontWeight: isActive ? '600' : '400',
          background: isActive ? 'rgba(255,154,60,0.18)' : 'transparent',
          color: isActive ? '#FF9A3C' : '#C4CDD9',
          fontFamily: 'Cabinet Grotesk',
        }}>
          <span style={{ fontSize: '20px', width: '24px', textAlign: 'center', flexShrink: 0 }}>{icon}</span>
          <span>{label}</span>
        </div>
      )}
    </NavLink>
  )
}

function VerificationBanner({ email }) {
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('efundi_banner_dismissed') === '1'
  )

  const dismiss = () => {
    sessionStorage.setItem('efundi_banner_dismissed', '1')
    setDismissed(true)
  }

  if (dismissed) return null

  const resend = async () => {
    if (loading || sent) return
    setLoading(true)
    try {
      await authApi.resendVerification(email)
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: '#FFF7ED', borderBottom: '1px solid #FED7AA',
      padding: '10px 24px', display: 'flex', alignItems: 'center',
      gap: '12px', flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: '15px' }}>⚠️</span>
      <span style={{ fontSize: '15px', color: '#92400E', flex: 1 }}>
        Your email is not verified. Verify to unlock bookings.
      </span>
      {sent ? (
        <span style={{ fontSize: '14px', color: '#16A34A', fontWeight: '600' }}>Email sent ✓</span>
      ) : (
        <button
          onClick={resend}
          disabled={loading}
          style={{
            background: '#E8501A', color: '#FFFFFF', border: 'none',
            borderRadius: '6px', padding: '5px 14px', fontSize: '14px',
            fontWeight: '600', fontFamily: 'Cabinet Grotesk', cursor: 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Sending…' : 'Resend verification'}
        </button>
      )}
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400E', fontSize: '18px', lineHeight: 1, padding: '2px', opacity: 0.6, flexShrink: 0 }}
      >✕</button>
    </div>
  )
}

function VerifiedToast({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div style={{
      position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
      background: '#F0FDF4', border: '1px solid #86EFAC',
      borderRadius: '10px', padding: '12px 20px',
      display: 'flex', alignItems: 'center', gap: '10px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    }}>
      <span style={{ fontSize: '20px' }}>✅</span>
      <div>
        <div style={{ fontSize: '14px', fontWeight: '700', color: '#15803D' }}>Email verified!</div>
        <div style={{ fontSize: '13px', color: '#166534' }}>Your account is fully active.</div>
      </div>
      <button onClick={onDone} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#15803D', fontSize: '16px', marginLeft: '8px' }}>✕</button>
    </div>
  )
}

export default function CustomerLayout() {
  const { user, setUser, logout } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [showVerifiedToast, setShowVerifiedToast] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  useEffect(() => {
    if (searchParams.get('verified') !== '1') return

    const refreshUser = async () => {
      try {
        setShowVerifiedToast(true)
        const userId = user?.user_id || decodeToken(localStorage.getItem('access_token'))?.user_id
        if (!userId) return
        const res = await authApi.getUser(userId)
        setUser(res.data)
      } catch {
        // ignore failures, banner may be hidden once auth state refreshes
      } finally {
        navigate(window.location.pathname, { replace: true })
      }
    }

    refreshUser()
  }, [searchParams, navigate, user?.user_id, setUser])

  // Re-fetch whenever the logged-in user is unverified, including cross-tab updates.
  useEffect(() => {
    if (!user?.user_id || user.verified_email) return
    authApi.getUser(user.user_id)
      .then(res => setUser(res.data))
      .catch(() => {})
  }, [user?.user_id, user?.verified_email, setUser])

  useEffect(() => {
    if (user?.verified_email) return
    if (!localStorage.getItem('efundi_email_verified')) return

    const refreshUser = async () => {
      const userId = user?.user_id || decodeToken(localStorage.getItem('access_token'))?.user_id
      if (!userId) return
      try {
        const res = await authApi.getUser(userId)
        setUser(res.data)
      } catch {
        // ignore refresh failures
      }
    }

    refreshUser()
  }, [user?.user_id, user?.verified_email, setUser])

  useEffect(() => {
    if (!user?.user_id || user.verified_email) return
    const onStorage = (e) => {
      if (e.key === 'efundi_email_verified') {
        authApi.getUser(user.user_id)
          .then(res => setUser(res.data))
          .catch(() => {})
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [user?.user_id, user?.verified_email, setUser]) // eslint-disable-line react-hooks/exhaustive-deps

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || '?'
    : '?'

  return (
    <div className="dashboard-shell customer-dashboard-shell" style={{ background: 'var(--ink)', fontFamily: 'Cabinet Grotesk' }}>

      {/* ── Sidebar (hidden on mobile) ───────────────────────────────────────── */}
      <aside className="app-sidebar" style={{ width: collapsed ? '78px' : '220px' }}>
        <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px', width: '26px', height: '26px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.08)', color: '#FFFFFF' }}>⚡</span>
            {!collapsed && (
              <div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontFamily: 'DM Mono', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                  Customer Portal
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            style={{
              width: '30px', height: '30px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)', color: '#FFFFFF', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
            }}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>
        <div style={{ flex: 1, padding: collapsed ? '16px 6px' : '16px 12px', overflowY: 'auto' }}>
          {!collapsed && (
            <div style={{ fontSize: '11px', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', padding: '0 8px', marginBottom: '8px', fontFamily: 'DM Mono' }}>
              Menu
            </div>
          )}
          {NAV.map(item => <NavItem key={item.to} compact={collapsed} {...item} />)}
        </div>
        <div style={{ padding: collapsed ? '12px 6px 16px' : '12px 12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {BOTTOM_NAV.map(item => <NavItem key={item.to} compact={collapsed} {...item} />)}
          <div style={{ marginTop: '6px' }}>
            <UserMenu user={user} logout={logout} accentColor={ACCENT} profilePath="/customer/settings" statsPath="/customer/payments" compact={collapsed} />
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className="app-main">

        {/* Mobile topbar (hidden on desktop) */}
        <header className="mobile-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px', width: '28px', height: '28px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)' }}>⚡</span>
            <span style={{ fontFamily: "'Times New Roman', Times, serif", fontWeight: '700', fontSize: '18px', color: '#FFFFFF' }}>
              <span style={{ color: ACCENT }}>e</span>Fundi
            </span>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
            style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#FFFFFF', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: 0 }}
          >
            {[0, 1, 2].map(i => (
              <span key={i} style={{ display: 'block', width: '18px', height: '2px', background: '#FFFFFF', borderRadius: '2px' }} />
            ))}
          </button>
        </header>

        {user && !user.verified_email && <VerificationBanner email={user.email} />}
        {showVerifiedToast && <VerifiedToast onDone={() => setShowVerifiedToast(false)} />}
        <div style={{ flex: 1 }}><Outlet /></div>
      </main>

      {/* ── Mobile drawer ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            />
            <motion.nav
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 301, width: '280px', background: NAVY, display: 'flex', flexDirection: 'column', boxShadow: '4px 0 24px rgba(0,0,0,0.4)' }}
            >
              <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '16px', width: '26px', height: '26px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.08)' }}>⚡</span>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontFamily: 'DM Mono', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Customer Portal</div>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}
                >✕</button>
              </div>
              <div style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
                <div style={{ fontSize: '11px', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', padding: '4px 8px 10px', fontFamily: 'DM Mono' }}>Menu</div>
                {[...NAV, ...BOTTOM_NAV].map(item => (
                  <MobileNavItem key={item.to} {...item} onClose={() => setDrawerOpen(false)} />
                ))}
              </div>
              <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <UserMenu user={user} logout={logout} accentColor={ACCENT} profilePath="/customer/settings" statsPath="/customer/payments" />
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

    </div>
  )
}
