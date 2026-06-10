import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '../../api/auth'
import usePageTitle from '../../hooks/usePageTitle'

const ROLES = [
  { value: 'Customer',   label: 'Customer',   icon: '🏠', desc: 'Book home services',  accent: '#E8501A' },
  { value: 'Technician', label: 'Technician', icon: '🔧', desc: 'Accept jobs & earn',  accent: '#1B2D5E' },
]

const PANEL = {
  Customer: {
    img:      '/images/technicians/technician-female.png',
    cover:    false,
    overlay:  'linear-gradient(to top, rgba(27,45,94,0.88) 0%, rgba(27,45,94,0.4) 55%, transparent 100%)',
    headline: 'Home services,\non demand.',
    sub:      'Verified plumbers, electricians, carpenters & cleaners — booked in minutes.',
  },
  Technician: {
    img:      '/images/technicians/workshop-technician.jpg',
    cover:    true,
    overlay:  'linear-gradient(to top, rgba(11,17,32,0.9) 0%, rgba(11,17,32,0.35) 55%, transparent 100%)',
    headline: 'Turn your skills\ninto income.',
    sub:      'Accept jobs near you, set your own hours, and get paid instantly via M-Pesa.',
  },
}

const SPECS = ['Electrical', 'Plumbing', 'Carpentry', 'Cleaning', 'Other']

export default function RegisterPage() {
  usePageTitle('Register')
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [role, setRole] = useState(params.get('role') === 'Technician' ? 'Technician' : 'Customer')
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', email2: '', phone_number: '',
    username: '', password: '', password2: '',
    years_of_experience: '',
  })
  const [selectedSpecs, setSelectedSpecs] = useState([])
  const [error, setError]       = useState('')
  const [registered, setRegistered] = useState(false)

  const accent = role === 'Technician' ? '#1B2D5E' : '#E8501A'

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: '8px',
    border: '1px solid #E2E8F0', background: '#FFFFFF',
    fontSize: '16px', color: '#0F172A', outline: 'none',
    fontFamily: 'Cabinet Grotesk', transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  }
  const focusOn  = (e) => (e.target.style.borderColor = accent)
  const focusOff = (e) => (e.target.style.borderColor = '#E2E8F0')

  const toggleSpec = (spec) => {
    setSelectedSpecs(prev =>
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    )
  }

  const mutation = useMutation({
    mutationFn: (data) => authApi.register(data),
    onSuccess: () => {
      setRegistered(true)
    },
    onError: (err) => {
      const d = err.response?.data
      if (!d) { setError('Registration failed. Please try again.'); return }
      if (typeof d === 'string') { setError(d); return }
      const lines = Object.entries(d).map(([field, msgs]) => {
        const label = field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        return `${label}: ${Array.isArray(msgs) ? msgs[0] : msgs}`
      })
      setError(lines.join('\n'))
    },
  })

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const submit = (e) => {
    e.preventDefault()
    setError('')
    if (form.email !== form.email2) { setError('Email addresses do not match. Please check and try again.'); return }
    if (form.password !== form.password2) { setError('Passwords do not match.'); return }
    if (role === 'Technician' && selectedSpecs.length === 0) {
      setError('Please select at least one specialization.')
      return
    }
    const { email2: _dropped, ...rest } = form
    const payload = { ...rest, role }
    if (role === 'Technician') {
      payload.specialization = selectedSpecs.join(', ')
    } else {
      delete payload.years_of_experience
    }
    mutation.mutate(payload)
  }

  const Label = ({ children }) => (
    <label style={{ display: 'block', fontSize: '15px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
      {children}
    </label>
  )

  const panel = PANEL[role]

  if (registered) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F1F5F9', padding: '24px' }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
          style={{ background: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 4px 32px rgba(0,0,0,0.08)', padding: '52px 44px', maxWidth: '480px', width: '100%', textAlign: 'center' }}
        >
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(22,163,74,0.1)', border: '2px solid rgba(22,163,74,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 24px' }}>
            ✅
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: '700', color: '#0F172A', marginBottom: '12px', fontFamily: 'Clash Display' }}>
            Account created!
          </h2>
          <p style={{ fontSize: '16px', color: '#374151', lineHeight: '1.7', marginBottom: '10px' }}>
            Your account is ready — you can log in now.
          </p>
          <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '10px', padding: '14px 18px', marginBottom: '28px', textAlign: 'left' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#15803D', marginBottom: '4px' }}>📬 Check your email</div>
            <div style={{ fontSize: '13px', color: '#166534', lineHeight: '1.65' }}>
              We sent a verification link to <strong>{form.email}</strong>. Verify your email to unlock all features — you can do this now or later.
            </div>
          </div>
          <motion.button
            whileHover={{ translateY: -1 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate(role === 'Technician' ? '/login/technician' : '/login')}
            style={{ width: '100%', padding: '13px', borderRadius: '10px', border: 'none', background: accent, color: '#FFFFFF', fontSize: '16px', fontWeight: '700', fontFamily: 'Cabinet Grotesk', cursor: 'pointer', marginBottom: '12px' }}
          >
            Proceed to login →
          </motion.button>
          <p style={{ fontSize: '13px', color: '#94A3B8', marginTop: '4px' }}>
            Didn't receive the email? Check spam or{' '}
            <button
              onClick={() => setRegistered(false)}
              style={{ background: 'none', border: 'none', color: accent, fontWeight: '600', cursor: 'pointer', fontSize: '13px', padding: 0 }}
            >
              register again
            </button>.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="responsive-split" style={{ minHeight: '100vh' }}>

      {/* Left panel: role-aware hero */}
      <div className="register-hero-panel split-panel sidebar" style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <AnimatePresence mode="wait">
          <motion.img key={panel.img} src={panel.img} alt="" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.04 }} transition={{ duration: 0.45 }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: panel.cover ? 'cover' : 'contain', objectPosition: panel.cover ? 'center' : 'bottom center' }} />
        </AnimatePresence>
        <div style={{ position: 'absolute', inset: 0, background: panel.overlay }} />
        <div style={{ position: 'relative', padding: '40px', zIndex: 1 }}>
          <AnimatePresence mode="wait">
            <motion.div key={role} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
              <div style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '28px', fontWeight: '700', color: '#FFFFFF', lineHeight: 1.25, marginBottom: '10px', whiteSpace: 'pre-line' }}>{panel.headline}</div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{panel.sub}</div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Right panel: form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F1F5F9', overflowY: 'auto', padding: '40px 32px' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: '480px' }}
      >
        <div style={{
          background: '#FFFFFF', borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          padding: '40px 36px',
        }}>
          {/* Logo */}
          <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px', cursor: 'pointer', width: 'fit-content' }}>
            <img src="/efundi_icon.svg" width="40" height="40" alt="myFundi Hub" style={{ borderRadius: '8px' }} />
            <span style={{ fontFamily: 'Clash Display', fontSize: '22px', fontWeight: '700', color: '#1B2D5E' }}>
              <span style={{ color: '#E8501A' }}>my</span>Fundi Hub
            </span>
          </div>

          <h1 style={{ fontFamily: 'Clash Display', fontSize: '24px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>
            Create account
          </h1>
          <p style={{ fontSize: '16px', color: '#64748B', marginBottom: '24px' }}>
            Choose your role to get started
          </p>

          {/* Role selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
            {ROLES.map((r) => (
              <motion.button
                key={r.value} type="button" whileTap={{ scale: 0.98 }}
                onClick={() => { setRole(r.value); setSelectedSpecs([]) }}
                style={{
                  padding: '16px 14px', textAlign: 'left', borderRadius: '10px',
                  border: `2px solid ${role === r.value ? r.accent : '#E2E8F0'}`,
                  background: role === r.value ? `${r.accent}08` : '#FFFFFF',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <div style={{ fontSize: '22px', marginBottom: '8px' }}>{r.icon}</div>
                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '2px', color: role === r.value ? r.accent : '#0F172A' }}>
                  {r.label}
                </div>
                <div style={{ fontSize: '14px', color: '#64748B' }}>{r.desc}</div>
              </motion.button>
            ))}
          </div>

          <div style={{ marginBottom: '20px', padding: '16px 18px', borderRadius: '16px', background: '#FEF3C7', border: '1px solid #FDE68A', color: '#92400E' }}>
            <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '8px' }}>
              Registering as a {role.toLowerCase()}?
            </div>
            <div style={{ fontSize: '14px', lineHeight: '1.6', marginBottom: '10px' }}>
              {role === 'Customer'
                ? 'If you are a technician, switch to technician registration so we can collect your skills, availability and payout details.'
                : 'If you are a customer, switch to customer registration to skip the technician onboarding details and get straight to booking.'}
            </div>
            <button
              type="button"
              onClick={() => { setRole(role === 'Customer' ? 'Technician' : 'Customer'); setSelectedSpecs([]) }}
              style={{ padding: '10px 16px', borderRadius: '999px', border: '1px solid #FDBA74', background: '#FFFFFF', color: '#92400E', fontWeight: '700', cursor: 'pointer' }}
            >
              Switch to {role === 'Customer' ? 'Technician' : 'Customer'} registration
            </button>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              style={{
                marginBottom: '20px', padding: '12px 14px', borderRadius: '8px',
                background: '#FEF2F2', border: '1px solid #FECACA',
                color: '#DC2626', fontSize: '15px', whiteSpace: 'pre-line', lineHeight: '1.7',
              }}
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={submit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              {[['first_name', 'First Name', 'Jane'], ['last_name', 'Last Name', 'Wanjiku']].map(([name, label, ph]) => (
                <div key={name}>
                  <Label>{label}</Label>
                  <input name={name} value={form[name]} onChange={handle}
                    placeholder={ph} required style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <Label>Email</Label>
                <input name="email" type="email" value={form.email} onChange={handle}
                  placeholder="jane@email.com" required style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
              </div>
              <div>
                <Label>Confirm Email</Label>
                <input
                  name="email2" type="email" value={form.email2} onChange={handle}
                  placeholder="Re-enter email" required
                  style={{
                    ...inputStyle,
                    borderColor: form.email2 && form.email2 !== form.email ? '#DC2626' : '#E2E8F0',
                  }}
                  onFocus={focusOn}
                  onBlur={e => {
                    focusOff(e)
                    if (form.email2 && form.email2 !== form.email) {
                      e.target.style.borderColor = '#DC2626'
                    }
                  }}
                />
                {form.email2 && form.email2 !== form.email && (
                  <p style={{ fontSize: '12px', color: '#DC2626', marginTop: '4px', margin: '4px 0 0' }}>
                    Emails do not match
                  </p>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <Label>Phone Number</Label>
              <input name="phone_number" type="tel" value={form.phone_number} onChange={handle}
                placeholder="0712345678" required style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <Label>Username</Label>
              <input name="username" value={form.username} onChange={handle}
                placeholder="jane_wanjiku" required style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
            </div>

            {/* Technician-only fields */}
            <AnimatePresence>
              {role === 'Technician' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}
                >
                  {/* Specialization chip picker */}
                  <div style={{ marginBottom: '16px' }}>
                    <Label>Specialization</Label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                      {SPECS.map(spec => {
                        const selected = selectedSpecs.includes(spec)
                        return (
                          <button
                            key={spec} type="button"
                            onClick={() => toggleSpec(spec)}
                            style={{
                              padding: '7px 14px', borderRadius: '20px', border: 'none',
                              fontSize: '14px', fontWeight: selected ? '700' : '500',
                              fontFamily: 'Cabinet Grotesk', cursor: 'pointer',
                              background: selected ? accent : '#F1F5F9',
                              color: selected ? '#FFFFFF' : '#374151',
                              transition: 'all 0.15s',
                            }}
                          >
                            {spec}
                          </button>
                        )
                      })}
                    </div>
                    <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>
                      Select all that apply. If your skills don't match the above, select <strong>Other</strong>.
                    </p>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <Label>Years of Experience</Label>
                    <input name="years_of_experience" type="number" min="0" value={form.years_of_experience}
                      onChange={handle} placeholder="3" style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              {[['password', 'Password'], ['password2', 'Confirm Password']].map(([name, label]) => (
                <div key={name}>
                  <Label>{label}</Label>
                  <input name={name} type="password" value={form[name]} onChange={handle}
                    placeholder="••••••••" required style={inputStyle} onFocus={focusOn} onBlur={focusOff} />
                </div>
              ))}
            </div>

            <motion.button
              type="submit" disabled={mutation.isPending}
              whileHover={{ translateY: -1 }} whileTap={{ scale: 0.98 }}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
                background: accent, color: '#FFFFFF', fontSize: '17px', fontWeight: '600',
                fontFamily: 'Cabinet Grotesk', cursor: mutation.isPending ? 'not-allowed' : 'pointer',
                opacity: mutation.isPending ? 0.7 : 1, transition: 'background 0.3s, opacity 0.15s',
              }}
            >
              {mutation.isPending ? 'Creating account…' : 'Create Account'}
            </motion.button>
          </form>

          <p style={{ fontSize: '15px', textAlign: 'center', color: '#64748B', marginTop: '20px' }}>
            Already have an account?{' '}
            <Link to={role === 'Technician' ? '/login/technician' : '/login'} style={{ color: accent, fontWeight: '600', textDecoration: 'none' }}>
              Sign in →
            </Link>
          </p>
        </div>
      </motion.div>
      </div>

      <style>{`
        @media (max-width: 768px) { .register-hero-panel { display: none !important; } }
      `}</style>
    </div>
  )
}
