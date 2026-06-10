import { useNavigate } from 'react-router-dom'
import { useMediaQuery } from '../../hooks/useMediaQuery'

const ORANGE = '#E8501A'

const COLS = [
  {
    heading: 'Quick links',
    items: [
      { label: 'Book a service',   path: '/register?role=Customer' },
      { label: 'How it works',     path: '/#how-it-works'          },
      { label: 'For technicians',  path: '/#technicians'           },
      { label: 'Register',         path: '/register'               },
      { label: 'Log in',           path: '/login'                  },
    ],
  },
  {
    heading: 'Services',
    items: [
      { label: 'Electrical repairs', path: '/register?role=Customer' },
      { label: 'Plumbing',           path: '/register?role=Customer' },
      { label: 'Carpentry',          path: '/register?role=Customer' },
      { label: 'Cleaning',           path: '/register?role=Customer' },
      { label: 'Other services',     path: '/register?role=Customer' },
    ],
  },
  {
    heading: 'Support',
    items: [
      { label: 'Contact us',       href: 'mailto:efundiz01@gmail.com' },
      { label: 'Help Centre',      href: 'mailto:efundiz01@gmail.com' },
      { label: 'Privacy Policy',   href: '#' },
      { label: 'Terms of Service', href: '#' },
    ],
  },
]

const CONTACT = [
  { icon: '✉', text: 'efundiz01@gmail.com', href: 'mailto:efundiz01@gmail.com' },
  { icon: '📞', text: '+254 799 160 014',    href: 'tel:+254799160014'          },
  { icon: '📞', text: '0700 917 222',        href: 'tel:0700917222'             },
  { icon: '📍', text: 'Nairobi, Kenya',      href: null                         },
]

function LinkItem({ item, navigate }) {
  const style = {
    background: 'none', border: 'none', padding: 0,
    color: 'rgba(255,255,255,0.45)', fontSize: '13px',
    cursor: 'pointer', textAlign: 'left', textDecoration: 'none',
    transition: 'color 0.18s', display: 'block',
  }
  const hover = e => (e.currentTarget.style.color = '#FFF')
  const leave = e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')

  return item.href ? (
    <a href={item.href} style={style} onMouseEnter={hover} onMouseLeave={leave}>{item.label}</a>
  ) : (
    <button onClick={() => navigate(item.path)} style={style} onMouseEnter={hover} onMouseLeave={leave}>{item.label}</button>
  )
}

export default function AppFooter() {
  const navigate  = useNavigate()
  const isMobile  = useMediaQuery('(max-width: 768px)')

  if (isMobile) {
    return (
      <footer style={{ background: 'rgba(10,17,32,1)', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>

        {/* Brand + tagline */}
        <div style={{ padding: '32px 20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <img src="/efundi_icon.svg" width="30" height="30" alt="myFundi Hub" style={{ borderRadius: '8px' }} />
            <span style={{ fontFamily: "'Times New Roman', Times, serif", fontWeight: '700', fontSize: '18px', color: '#FFFFFF' }}>
              <span style={{ color: ORANGE }}>my</span>Fundi Hub
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.42)', lineHeight: '1.7', marginBottom: '16px' }}>
            Kenya's home services platform — connecting homeowners with verified, GPS-matched local technicians.
          </p>

          {/* Contact — 2-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {CONTACT.map(({ icon, text, href }) => {
              const inner = (
                <>
                  <span style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(232,80,26,0.1)', border: '1px solid rgba(232,80,26,0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}>{icon}</span>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.42)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span>
                </>
              )
              const sharedStyle = { display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', minWidth: 0 }
              return href ? (
                <a key={text} href={href} style={sharedStyle}>{inner}</a>
              ) : (
                <div key={text} style={sharedStyle}>{inner}</div>
              )
            })}
          </div>
        </div>

        {/* Link columns — 3-column grid */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
          {COLS.map(col => (
            <div key={col.heading}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#FFFFFF', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '12px', fontFamily: 'DM Mono' }}>
                {col.heading}
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {col.items.map(item => (
                  <li key={item.label}>
                    <LinkItem item={item} navigate={navigate} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(232,80,26,0.08)', border: '1px solid rgba(232,80,26,0.2)', fontSize: '11px', color: ORANGE, fontFamily: 'DM Mono' }}>
            🇰🇪 Made in Kenya
          </div>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map(label => (
              <a key={label} href="#"
                style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', textDecoration: 'none' }}>
                {label}
              </a>
            ))}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', fontFamily: 'DM Mono' }}>
            © {new Date().getFullYear()} myFundi Hub.
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer style={{ background: 'rgba(10,17,32,1)', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>

      {/* Main grid */}
      <div className="grid-footer" style={{ maxWidth: '1280px', margin: '0 auto', padding: '52px 48px 40px' }}>

        {/* Brand column */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <img src="/efundi_icon.svg" width="32" height="32" alt="myFundi Hub" style={{ borderRadius: '8px' }} />
            <span style={{ fontFamily: "'Times New Roman', Times, serif", fontWeight: '700', fontSize: '19px', color: '#FFFFFF' }}>
              <span style={{ color: ORANGE }}>my</span>Fundi Hub
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.75', marginBottom: '20px', maxWidth: '260px' }}>
            Kenya's home services platform — connecting homeowners with verified, GPS-matched local technicians.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '20px' }}>
            {CONTACT.map(({ icon, text, href }) => {
              const style = { display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255,255,255,0.42)', fontSize: '13px', textDecoration: 'none', transition: 'color 0.18s' }
              const inner = (
                <>
                  <span style={{ width: '26px', height: '26px', borderRadius: '7px', background: 'rgba(232,80,26,0.1)', border: '1px solid rgba(232,80,26,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>{icon}</span>
                  {text}
                </>
              )
              return href ? (
                <a key={text} href={href} style={style}
                  onMouseEnter={e => (e.currentTarget.style.color = '#FFF')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.42)')}>
                  {inner}
                </a>
              ) : (
                <div key={text} style={style}>{inner}</div>
              )
            })}
          </div>
        </div>

        {/* Link columns */}
        {COLS.map(col => (
          <div key={col.heading}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#FFFFFF', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '18px', fontFamily: 'DM Mono' }}>
              {col.heading}
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '11px' }}>
              {col.items.map(item => (
                <li key={item.label}>
                  <LinkItem item={item} navigate={navigate} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontFamily: 'DM Mono' }}>
          © {new Date().getFullYear()} myFundi Hub. All rights reserved.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(232,80,26,0.08)', border: '1px solid rgba(232,80,26,0.2)', fontSize: '11px', color: ORANGE, fontFamily: 'DM Mono' }}>
          🇰🇪 Made in Kenya
        </div>
        <div style={{ display: 'flex', gap: '18px' }}>
          {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map(label => (
            <a key={label} href="#"
              style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', textDecoration: 'none', transition: 'color 0.18s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}>
              {label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
