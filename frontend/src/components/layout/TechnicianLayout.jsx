import { NavLink, Outlet, useSearchParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { bookingsApi } from '../../api/bookings'
import { technicianApi } from '../../api/technicians'
import useAuthStore from '../../store/authStore'
import { authApi, decodeToken } from '../../api/auth'
import UserMenu from '../ui/UserMenu'

const ACCENT = '#E8501A'
const NAVY   = '#1B2D5E'

const WORK_NAV = [
  { to: '/technician/dashboard', icon: '⚡', label: 'Dashboard'   },
  { to: '/technician/available', icon: '📋', label: 'Job Requests' },
  { to: '/technician/jobs',      icon: '🔧', label: 'My Jobs'      },
]

const FINANCE_NAV = [
  { to: '/technician/earnings',  icon: '💰', label: 'Earnings & Wallet' },
  { to: '/technician/settings',  icon: '⚙️', label: 'Profile & Skills'  },
]

function MobileNavItem({ to, icon, label, badge, onClose }) {
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
          <span style={{ flex: 1 }}>{label}</span>
          {badge > 0 && (
            <span style={{ minWidth: '20px', height: '20px', borderRadius: '10px', padding: '0 5px', fontSize: '13px', fontWeight: '700', background: ACCENT, color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{badge}</span>
          )}
        </div>
      )}
    </NavLink>
  )
}

function NavItem({ to, label, badge }) {
  return (
    <NavLink to={to} style={{ textDecoration: 'none' }}>
      {({ isActive }) => (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '9px 12px', borderRadius: '8px', marginBottom: '2px',
          fontSize: '16px', fontWeight: isActive ? '600' : '400',
          background: isActive ? 'rgba(255,154,60,0.18)' : 'transparent',
          color: isActive ? '#FF9A3C' : '#94A3B8',
          cursor: 'pointer', transition: 'all 0.15s',
          fontFamily: 'Cabinet Grotesk',
        }}>
          <span style={{ flex: 1 }}>{label}</span>
          {badge > 0 && (
            <span style={{
              minWidth: '20px', height: '20px', borderRadius: '10px', padding: '0 5px',
              fontSize: '13px', fontWeight: '700',
              background: isActive ? 'rgba(255,154,60,0.35)' : ACCENT,
              color: '#FFFFFF',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>{badge}</span>
          )}
        </div>
      )}
    </NavLink>
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
        <div style={{ fontSize: '13px', color: '#166534' }}>Your account is now active.</div>
      </div>
      <button onClick={onDone} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#15803D', fontSize: '16px', marginLeft: '8px' }}>✕</button>
    </div>
  )
}

export default function TechnicianLayout() {
  const { user, setUser, logout } = useAuthStore()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [showVerifiedToast, setShowVerifiedToast] = useState(false)
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
        // ignore refresh failures
      } finally {
        navigate(window.location.pathname, { replace: true })
      }
    }

    refreshUser()
  }, [navigate, searchParams, setUser, user?.user_id]) // eslint-disable-line react-hooks/exhaustive-deps

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || '?'
    : '?'

  const { data: profile } = useQuery({
    queryKey: ['tech-profile', user?.user_id],
    queryFn:  () => technicianApi.getProfile(user.user_id).then(r => r.data),
    enabled:  !!user?.user_id,
  })

  const { data: bookings = [] } = useQuery({
    queryKey: ['tech-bookings'],
    queryFn:  () => bookingsApi.list().then(r => r.data),
    refetchInterval: 30_000,
  })

  const availableCount = bookings.filter(b => b.status === 'broadcasted').length
  const isVerified     = profile?.verification_status === 'Verified'
  const isAvailable    = profile?.is_available ?? false

  const availMutation = useMutation({
    mutationFn: (val) => technicianApi.setAvailability(user.user_id, val),
    onSuccess:  () => qc.invalidateQueries(['tech-profile']),
  })

  return (
    <div className="dashboard-shell technician-dashboard-shell" style={{ background: 'var(--ink)', fontFamily: 'Cabinet Grotesk' }}>

      {/* ── Sidebar (hidden on mobile) ───────────────────────────────────────── */}
      <aside className="app-sidebar">
        {/* Section label */}
        <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontFamily: 'DM Mono', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            Technician Portal
          </div>
        </div>

        {/* Work nav */}
        <div style={{ padding: '16px 12px 8px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', padding: '0 8px', marginBottom: '8px', fontFamily: 'DM Mono' }}>
            Work
          </div>
          {WORK_NAV.map(({ to, label }) => (
            <NavItem key={label} to={to} label={label}
              badge={label === 'Job Requests' ? availableCount : 0}
            />
          ))}
        </div>

        {/* Finance nav */}
        <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '4px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', padding: '8px 8px 8px', fontFamily: 'DM Mono' }}>
            Finance
          </div>
          {FINANCE_NAV.map(({ to, label }) => (
            <NavItem key={label} to={to} label={label} />
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Online toggle */}
        {isVerified && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                disabled={availMutation.isPending}
                onClick={() => availMutation.mutate(!isAvailable)}
                style={{
                  width: '40px', height: '22px', borderRadius: '11px', border: 'none', flexShrink: 0,
                  background: isAvailable ? ACCENT : 'rgba(255,255,255,0.15)',
                  cursor: availMutation.isPending ? 'not-allowed' : 'pointer',
                  position: 'relative',
                  opacity: availMutation.isPending ? 0.6 : 1,
                  transition: 'background 0.3s',
                }}
              >
                <motion.div
                  animate={{ x: isAvailable ? 18 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  style={{ position: 'absolute', top: '2px', width: '18px', height: '18px', borderRadius: '50%', background: 'white' }}
                />
              </motion.button>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: isAvailable ? '#FF9A3C' : 'rgba(255,255,255,0.4)' }}>
                  {isAvailable ? 'Online' : 'Offline'}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontFamily: 'DM Mono' }}>
                  {isAvailable ? 'Accepting jobs' : 'Not accepting'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User chip */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '8px 8px 12px' }}>
          <UserMenu
            user={user}
            logout={logout}
            accentColor={ACCENT}
            profilePath="/technician/settings"
            statsPath="/technician/earnings"
          />
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className="app-main">

        {/* Mobile topbar (hidden on desktop) */}
        <header className="mobile-topbar">
          <div onClick={() => navigate('/technician/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <span style={{ fontSize: '16px', width: '28px', height: '28px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)' }}>⚡</span>
            <span style={{ fontFamily: "'Times New Roman', Times, serif", fontWeight: '700', fontSize: '18px', color: '#FFFFFF' }}>
              <span style={{ color: ACCENT }}>my</span>Fundi Hub
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isVerified && (
              <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', border: `1px solid ${isAvailable ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.15)'}`, background: isAvailable ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)', color: isAvailable ? '#6EE7B7' : 'rgba(255,255,255,0.4)', fontFamily: 'DM Mono', fontWeight: '600' }}>
                {isAvailable ? 'Online' : 'Offline'}
              </span>
            )}
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#FFFFFF', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: 0 }}
            >
              {[0, 1, 2].map(i => (
                <span key={i} style={{ display: 'block', width: '18px', height: '2px', background: '#FFFFFF', borderRadius: '2px' }} />
              ))}
            </button>
          </div>
        </header>

        {showVerifiedToast && <VerifiedToast onDone={() => setShowVerifiedToast(false)} />}
        <Outlet />
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
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontFamily: 'DM Mono', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Technician Portal</div>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}
                >✕</button>
              </div>

              <div style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
                <div style={{ fontSize: '11px', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', padding: '4px 8px 10px', fontFamily: 'DM Mono' }}>Work</div>
                {WORK_NAV.map(({ to, icon, label }) => (
                  <MobileNavItem key={to} to={to} icon={icon} label={label}
                    badge={label === 'Job Requests' ? availableCount : 0}
                    onClose={() => setDrawerOpen(false)}
                  />
                ))}
                <div style={{ fontSize: '11px', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', padding: '12px 8px 10px', fontFamily: 'DM Mono' }}>Finance</div>
                {FINANCE_NAV.map(({ to, icon, label }) => (
                  <MobileNavItem key={to} to={to} icon={icon} label={label} onClose={() => setDrawerOpen(false)} />
                ))}

                {isVerified && (
                  <div style={{ margin: '12px 0 4px', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        disabled={availMutation.isPending}
                        onClick={() => availMutation.mutate(!isAvailable)}
                        style={{ width: '40px', height: '22px', borderRadius: '11px', border: 'none', flexShrink: 0, background: isAvailable ? ACCENT : 'rgba(255,255,255,0.15)', cursor: availMutation.isPending ? 'not-allowed' : 'pointer', position: 'relative', opacity: availMutation.isPending ? 0.6 : 1, transition: 'background 0.3s' }}
                      >
                        <motion.div
                          animate={{ x: isAvailable ? 18 : 2 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          style={{ position: 'absolute', top: '2px', width: '18px', height: '18px', borderRadius: '50%', background: 'white' }}
                        />
                      </motion.button>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: isAvailable ? '#FF9A3C' : 'rgba(255,255,255,0.4)' }}>{isAvailable ? 'Online' : 'Offline'}</div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontFamily: 'DM Mono' }}>{isAvailable ? 'Accepting jobs' : 'Not accepting'}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <UserMenu user={user} logout={logout} accentColor={ACCENT} profilePath="/technician/settings" statsPath="/technician/earnings" />
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

    </div>
  )
}
