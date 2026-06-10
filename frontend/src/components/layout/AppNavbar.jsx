/**
 * Global navigation bar shown on public pages and authenticated dashboards.
 * Guests see public links and login/register buttons; signed-in users see role
 * information and a logout action.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from '../../store/authStore'

const ORANGE = '#E8501A'

const PUBLIC_LINKS = [
  { label: 'Services',        href: '/#services'    },
  { label: 'How it works',    href: '/#how-it-works' },
  { label: 'For technicians', href: '/#technicians'  },
]

const ROLE_HOME = {
  Customer:      '/customer/dashboard',
  Technician:    '/technician/dashboard',
  Admin:         '/admin/dashboard',
  'Super Admin': '/admin/dashboard',
}

export const NAVBAR_HEIGHT = 64

export default function AppNavbar() {
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login'); setMenuOpen(false) }
  const go = (path) => { navigate(path); setMenuOpen(false) }

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 200, height: `${NAVBAR_HEIGHT}px`,
        background: 'rgba(10,17,32,0.96)', backdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', padding: '0 24px', gap: '12px',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div
          onClick={() => go(isAuthenticated ? (ROLE_HOME[user?.role] || '/') : '/')}
          style={{ display: 'flex', alignItems: 'center', gap: '9px', cursor: 'pointer', flex: '0 0 auto', marginRight: '20px' }}
        >
          <img src="/efundi_icon.svg" width="32" height="32" alt="myFundi Hub" style={{ borderRadius: '8px' }} />
          <span style={{ fontFamily: "'Times New Roman', Times, serif", fontWeight: '700', fontSize: '19px', color: '#FFFFFF' }}>
            <span style={{ color: ORANGE }}>my</span>Fundi Hub
          </span>
        </div>

        {/* Centre links — public, desktop only */}
        {!isAuthenticated && (
          <div className="nav-links-desktop" style={{ flex: 1, justifyContent: 'center', gap: '2px' }}>
            {PUBLIC_LINKS.map(({ label, href }) => (
              <a key={label} href={href}
                style={{ padding: '7px 14px', borderRadius: '10px', color: 'rgba(255,255,255,0.55)', fontSize: '14px', fontWeight: '500', textDecoration: 'none', transition: 'color 0.18s, background 0.18s' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#FFF'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; e.currentTarget.style.background = 'transparent' }}>
                {label}
              </a>
            ))}
          </div>
        )}

        {/* Logged-in role badge */}
        {isAuthenticated && (
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: ORANGE, fontFamily: 'DM Mono', padding: '3px 10px', borderRadius: '20px', border: '1px solid rgba(232,80,26,0.35)', background: 'rgba(232,80,26,0.08)' }}>
              {user?.role}
            </span>
          </div>
        )}

        {/* Right: desktop auth / phone */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 auto' }}>
          {!isAuthenticated && (
            <>
              <a href="tel:+254799160014" className="nav-phone-desktop"
                style={{ alignItems: 'center', padding: '6px 8px', color: 'rgba(255,255,255,0.36)', fontSize: '12px', fontFamily: 'DM Mono', textDecoration: 'none', transition: 'color 0.18s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.72)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.36)')}>
                +254 799 160 014
              </a>
              <div className="nav-phone-desktop" style={{ alignItems: 'center', width: '1px', height: '22px', background: 'rgba(255,255,255,0.1)' }} />
              <button onClick={() => go('/login')}
                style={{ padding: '7px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.14)', background: 'transparent', color: 'rgba(255,255,255,0.65)', fontSize: '14px', fontWeight: '500', cursor: 'pointer', transition: 'color 0.18s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#FFF')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}>
                Log in
              </button>
              <motion.button whileHover={{ translateY: -1 }} whileTap={{ scale: 0.97 }}
                onClick={() => go('/register')}
                style={{ padding: '7px 16px', borderRadius: '10px', border: 'none', background: ORANGE, color: '#FFF', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                Get started →
              </motion.button>
            </>
          )}
          {isAuthenticated && (
            <>
              <span className="nav-phone-desktop" style={{ alignItems: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: '500' }}>
                {user?.first_name}
              </span>
              <button onClick={handleLogout}
                style={{ padding: '7px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.14)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '14px', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#FFF')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}>
                Log out
              </button>
            </>
          )}

          {/* Hamburger — mobile only */}
          <button className="nav-hamburger" onClick={() => setMenuOpen(o => !o)}
            style={{ alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', cursor: 'pointer', flexDirection: 'column', gap: '5px', padding: '0' }}>
            {[0,1,2].map(i => (
              <span key={i} style={{ display: 'block', width: '18px', height: '2px', background: menuOpen ? (i === 1 ? 'transparent' : '#FFF') : '#FFF', borderRadius: '2px', transition: 'transform 0.2s, opacity 0.2s',
                transform: menuOpen ? (i === 0 ? 'rotate(45deg) translate(5px,5px)' : i === 2 ? 'rotate(-45deg) translate(5px,-5px)' : 'none') : 'none' }} />
            ))}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            style={{ position: 'fixed', top: `${NAVBAR_HEIGHT}px`, left: 0, right: 0, zIndex: 199, background: 'rgba(10,17,32,0.98)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: '6px' }}
          >
            {!isAuthenticated && PUBLIC_LINKS.map(({ label, href }) => (
              <a key={label} href={href} onClick={() => setMenuOpen(false)}
                style={{ padding: '12px 16px', borderRadius: '10px', color: 'rgba(255,255,255,0.7)', fontSize: '16px', fontWeight: '500', textDecoration: 'none', display: 'block' }}>
                {label}
              </a>
            ))}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />
            {!isAuthenticated ? (
              <>
                <button onClick={() => go('/login')}
                  style={{ width: '100%', padding: '13px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#FFF', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginBottom: '8px' }}>
                  Log in
                </button>
                <button onClick={() => go('/register')}
                  style={{ width: '100%', padding: '13px', borderRadius: '10px', border: 'none', background: ORANGE, color: '#FFF', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>
                  Get started →
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', padding: '8px 16px' }}>
                  Signed in as <strong style={{ color: '#FFF' }}>{user?.first_name} {user?.last_name}</strong>
                </div>
                <button onClick={handleLogout}
                  style={{ width: '100%', padding: '13px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#FFF', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
                  Log out
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
