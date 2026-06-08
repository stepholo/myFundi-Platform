import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { authApi, decodeToken } from '../../api/auth'
import useAuthStore from '../../store/authStore'
import { useMediaQuery } from '../../hooks/useMediaQuery'

const ROLE_REDIRECT = {
  Customer:      '/customer/dashboard',
  Technician:    '/technician/dashboard',
  Admin:         '/admin/dashboard',
  'Super Admin': '/admin/dashboard',
}

export default function LoginShell({ config }) {
  const navigate  = useNavigate()
  const [params]  = useSearchParams()
  const setAuth   = useAuthStore((s) => s.setAuth)
  const isMobile  = useMediaQuery('(max-width: 768px)')

  const [form, setForm]         = useState(() => {
    const saved = localStorage.getItem('efundi_remembered_username')
    return { username: saved || '', password: '' }
  })
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('efundi_remembered_username'))
  const [error, setError]   = useState('')
  const [showPw, setShowPw] = useState(false)

  const justRegistered = params.get('registered') === '1'
  const accent = config.accent ?? '#E8501A'

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: async ({ data }) => {
      const payload = decodeToken(data.access)
      let user = { role: data.role, verified_email: data.verified_email }
      if (payload?.user_id) {
        try { user = (await authApi.getUser(payload.user_id)).data } catch { /* inactive */ }
      }
      setAuth(user, data.access, data.refresh)
      const redirectTo = params.get('redirect')
      navigate(redirectTo || ROLE_REDIRECT[data.role] || '/customer/dashboard')
    },
    onError: (err) => {
      if (err.response?.status === 403) {
        setError('Your email is not verified yet. Please check your inbox for the verification link.')
      } else {
        setError('Invalid username or password. Please try again.')
      }
    },
  })

  const [googleError, setGoogleError] = useState('')

  const handleGoogleCredential = async (response) => {
    setGoogleError('')
    try {
      const { data } = await authApi.googleLogin(response.credential)
      const payload = decodeToken(data.access)
      let user = { role: data.role, verified_email: data.verified_email }
      if (payload?.user_id) {
        try { user = (await authApi.getUser(payload.user_id)).data } catch { /* use minimal user */ }
      }
      setAuth(user, data.access, data.refresh)
      const redirectTo = params.get('redirect')
      navigate(redirectTo || ROLE_REDIRECT[data.role] || '/customer/dashboard')
    } catch (err) {
      setGoogleError(err.response?.data?.error || 'Google sign-in failed. Please try again.')
    }
  }

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId || !window.google?.accounts?.id) return
    window.google.accounts.id.initialize({ client_id: clientId, callback: handleGoogleCredential })
    const el = document.getElementById('google-signin-btn')
    if (el) window.google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', text: 'continue_with', width: el.offsetWidth || 360 })
  }, [isMobile]) // eslint-disable-line react-hooks/exhaustive-deps

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const submit = (e) => {
    e.preventDefault()
    setError('')
    if (rememberMe) {
      localStorage.setItem('efundi_remembered_username', form.username)
    } else {
      localStorage.removeItem('efundi_remembered_username')
    }
    mutation.mutate(form)
  }

  if (isMobile) {
    return (
      <MobileLoginShell
        config={config} accent={accent}
        form={form} handle={handle} submit={submit}
        error={error} showPw={showPw} setShowPw={setShowPw}
        mutation={mutation} justRegistered={justRegistered}
        rememberMe={rememberMe} setRememberMe={setRememberMe}
        googleError={googleError}
      />
    )
  }

  const heroCards = [
    { icon: '🚀', title: 'Instant access', desc: 'Login quickly and get straight to bookings or job requests.' },
    { icon: '🔒', title: 'Secure sessions', desc: 'Your credentials are protected and your data stays safe.' },
    { icon: '📱', title: 'Mobile ready', desc: 'Designed to look great on phones, tablets, and desktops.' },
  ]

  const inputStyle = {
    width: '100%', padding: '14px 16px', borderRadius: '12px',
    border: '1.5px solid rgba(255,255,255,0.3)',
    background: 'rgba(255,255,255,0.15)',
    fontSize: '15px', color: '#FFFFFF', outline: 'none',
    fontFamily: "'Times New Roman', Times, serif",
    transition: 'border-color 0.15s, background 0.15s',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px', boxSizing: 'border-box' }}>

      {/* Solid background */}
      <div style={{ position: 'fixed', inset: 0, background: config.bgColor, zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '12%', right: '-60px', width: '220px', height: '220px', borderRadius: '50%', background: 'rgba(232,80,26,0.14)', zIndex: 1, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '8%', left: '-60px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', zIndex: 1, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: '1160px', display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'stretch', justifyContent: 'center' }}>
        <div style={{ flex: '1 1 420px', minWidth: '320px', borderRadius: '28px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', boxShadow: '0 28px 80px rgba(0,0,0,0.28)', backdropFilter: 'blur(20px)', padding: '38px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '999px', background: 'rgba(255,255,255,0.16)', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', marginBottom: '22px' }}>
              <span>{config.roleIcon}</span>
              <span>{config.roleLabel}</span>
            </div>
            <h1 style={{ fontSize: 'clamp(34px, 5vw, 48px)', fontWeight: '800', lineHeight: 1.05, color: '#FFFFFF', marginBottom: '18px' }}>
              {config.headline}
            </h1>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.78)', lineHeight: '1.85', marginBottom: '32px', maxWidth: '520px' }}>
              {config.roleSub}
            </p>
            <div style={{ display: 'grid', gap: '14px' }}>
              {heroCards.map((card) => (
                <div key={card.title} style={{ display: 'flex', gap: '14px', padding: '18px', borderRadius: '20px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.14)' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '16px', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{card.icon}</div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#FFFFFF', marginBottom: '6px' }}>{card.title}</div>
                    <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.72)', lineHeight: '1.6' }}>{card.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '32px', padding: '18px 20px', borderRadius: '22px', background: 'rgba(255,255,255,0.08)', border: '1px dashed rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)', display: 'flex', gap: '12px', alignItems: 'center', fontSize: '14px' }}>
            <span style={{ width: '38px', height: '38px', borderRadius: '14px', background: 'rgba(255,255,255,0.16)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>✨</span>
            <span>Not this role? Switch to {config.altLink?.label} login to continue.</span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          style={{ flex: '1 1 420px', minWidth: '320px', maxWidth: '520px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div style={{ width: '100%', borderRadius: '28px', background: 'rgba(255,255,255,0.95)', boxShadow: '0 22px 60px rgba(0,0,0,0.18)', padding: '34px 30px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '140px', height: '140px', borderRadius: '50%', background: `${accent}20`, zIndex: 0 }} />
            <div style={{ position: 'absolute', bottom: '-30px', left: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(232,80,26,0.08)', zIndex: 0 }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <img src="/efundi_icon.svg" width="36" height="36" alt="eFundi" style={{ borderRadius: '10px' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'rgba(15,23,42,0.7)' }}>Welcome back</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#111827' }}>Sign in securely</div>
                </div>
              </div>

              {justRegistered && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  style={{ marginBottom: '18px', padding: '13px 14px', borderRadius: '14px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#166534', fontSize: '14px' }}>
                  ✅ Your account has been created. Please sign in to continue.
                </motion.div>
              )}

              {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  style={{ marginBottom: '18px', padding: '13px 14px', borderRadius: '14px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '14px' }}>
                  {error}
                </motion.div>
              )}

              <form onSubmit={submit} style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>
                    Username or Email
                  </label>
                  <input name="username" value={form.username} onChange={handle} placeholder="your@email.com" required style={{ ...inputStyle, background: '#FFFFFF', borderColor: '#CBD5E1', color: '#0F172A' }}
                    onFocus={e => { e.target.style.borderColor = accent; e.target.style.background = '#FFFFFF' }}
                    onBlur={e => { e.target.style.borderColor = '#CBD5E1'; e.target.style.background = '#FFFFFF' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input name="password" type={showPw ? 'text' : 'password'} value={form.password} onChange={handle} placeholder="••••••••" required style={{ ...inputStyle, paddingRight: '44px', background: '#FFFFFF', borderColor: '#CBD5E1', color: '#0F172A' }}
                      onFocus={e => { e.target.style.borderColor = accent; e.target.style.background = '#FFFFFF' }}
                      onBlur={e => { e.target.style.borderColor = '#CBD5E1'; e.target.style.background = '#FFFFFF' }} />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: '17px', padding: '2px', lineHeight: 1 }}
                      aria-label={showPw ? 'Hide password' : 'Show password'}>{showPw ? '🙈' : '👁️'}</button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                    <div
                      onClick={() => setRememberMe(v => !v)}
                      style={{
                        width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
                        border: `1.5px solid ${rememberMe ? accent : '#CBD5E1'}`,
                        background: rememberMe ? accent : '#FFFFFF',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s', cursor: 'pointer',
                      }}
                    >
                      {rememberMe && <span style={{ color: '#FFFFFF', fontSize: '11px', fontWeight: '800', lineHeight: 1 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>🔖</span> Remember me
                    </span>
                  </label>
                  <Link to="/reset-password" style={{ color: accent, fontWeight: '600', textDecoration: 'none', fontSize: '13px' }}>
                    Forgot password?
                  </Link>
                </div>

                <motion.button type="submit" disabled={mutation.isPending} whileHover={{ translateY: -1 }} whileTap={{ scale: 0.98 }}
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: 'none', background: accent, color: '#FFFFFF', fontSize: '16px', fontWeight: '700', cursor: mutation.isPending ? 'not-allowed' : 'pointer', opacity: mutation.isPending ? 0.75 : 1, transition: 'opacity 0.15s', boxShadow: `0 14px 28px ${accent}33` }}>
                  {mutation.isPending ? 'Signing in…' : 'Sign in'}
                </motion.button>
              </form>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0', fontSize: '13px', color: '#94A3B8' }}>
                <span style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
                or
                <span style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
              </div>

              {googleError && (
                <div style={{ marginBottom: '12px', padding: '10px 14px', borderRadius: '12px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '13px' }}>
                  {googleError}
                </div>
              )}
              <div id="google-signin-btn" style={{ width: '100%', marginBottom: '16px' }} />

              <p style={{ fontSize: '14px', textAlign: 'center', color: '#475569' }}>
                Don't have an account?{' '}
                <Link to={`/register${config.registerRole ? `?role=${config.registerRole}` : ''}`} style={{ color: accent, fontWeight: '700', textDecoration: 'none' }}>
                  Create one →
                </Link>
              </p>

              {config.altLink && (
                <div style={{ textAlign: 'center', marginTop: '18px' }}>
                  <Link to={config.altLink.to} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 18px', borderRadius: '999px', border: `1px solid ${accent}33`, background: 'rgba(255,255,255,0.92)', color: accent, fontWeight: '700', textDecoration: 'none' }}>
                    Switch to {config.altLink.label} login
                  </Link>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// ── Mobile Login ──────────────────────────────────────────────────────────────

function MobileLoginShell({ config, accent, form, handle, submit, error, showPw, setShowPw, mutation, justRegistered, rememberMe, setRememberMe, googleError }) {
  const inputStyle = {
    width: '100%', padding: '14px 16px', borderRadius: '14px',
    border: '1.5px solid #E2E8F0', background: '#F8FAFC',
    fontSize: '16px', color: '#0F172A', outline: 'none',
    fontFamily: 'Cabinet Grotesk', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  }

  return (
    <div style={{ minHeight: '100svh', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Solid background */}
      <div style={{ position: 'absolute', inset: 0, background: config.bgColor, zIndex: 0 }} />

      {/* Top bar: logo + name + portal — single centered row */}
      <div style={{ position: 'relative', zIndex: 2, padding: '48px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <img src="/efundi_icon.svg" width="36" height="36" alt="eFundi" style={{ borderRadius: '10px' }} />
        <span style={{ fontFamily: "'Times New Roman', Times, serif", fontWeight: '700', fontSize: '20px', color: '#FFFFFF' }}>
          <span style={{ color: accent }}>e</span>Fundi
        </span>
        <span style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span>{config.roleIcon}</span>
          <span>{config.roleLabel} Portal</span>
        </span>
      </div>

      {/* Headline area */}
      <div style={{ position: 'relative', zIndex: 2, flex: 1, padding: '24px 24px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#FFFFFF', margin: 0, lineHeight: 1.2, fontFamily: "'Times New Roman', Times, serif" }}>
          {config.headline}
        </h1>
      </div>

      {/* Form panel — slides up from bottom */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{
          position: 'relative', zIndex: 2,
          background: '#FFFFFF',
          borderRadius: '28px 28px 0 0',
          padding: '28px 24px 40px',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
        }}
      >
        {/* Pull handle */}
        <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#E2E8F0', margin: '0 auto 24px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '22px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748B' }}>Welcome back</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#111827' }}>Sign in to continue</div>
          </div>
        </div>

        {justRegistered && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '12px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#166534', fontSize: '14px' }}>
            ✅ Account created — sign in to continue.
          </motion.div>
        )}

        {error && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '12px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '14px' }}>
            {error}
          </motion.div>
        )}

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '7px' }}>
              Username or Email
            </label>
            <input
              name="username" value={form.username} onChange={handle}
              placeholder="your@email.com" required
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = accent; e.target.style.background = '#FFFFFF' }}
              onBlur={e =>  { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFC' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Password</label>
              <Link to="/reset-password" style={{ fontSize: '12px', color: accent, fontWeight: '600', textDecoration: 'none' }}>
                Forgot?
              </Link>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                name="password" type={showPw ? 'text' : 'password'}
                value={form.password} onChange={handle}
                placeholder="••••••••" required
                style={{ ...inputStyle, paddingRight: '44px' }}
                onFocus={e => { e.target.style.borderColor = accent; e.target.style.background = '#FFFFFF' }}
                onBlur={e =>  { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFC' }}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: '18px', padding: '2px', lineHeight: 1 }}
                aria-label={showPw ? 'Hide password' : 'Show password'}>{showPw ? '🙈' : '👁️'}</button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
              <div
                onClick={() => setRememberMe(v => !v)}
                style={{
                  width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                  border: `1.5px solid ${rememberMe ? accent : '#CBD5E1'}`,
                  background: rememberMe ? accent : '#F8FAFC',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s', cursor: 'pointer',
                }}
              >
                {rememberMe && <span style={{ color: '#FFFFFF', fontSize: '12px', fontWeight: '800', lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ fontSize: '14px', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>🔖</span> Remember me
              </span>
            </label>
          </div>

          <motion.button
            type="submit" disabled={mutation.isPending}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%', padding: '15px', borderRadius: '14px', border: 'none',
              background: accent, color: '#FFFFFF', fontSize: '16px', fontWeight: '700',
              cursor: mutation.isPending ? 'not-allowed' : 'pointer',
              opacity: mutation.isPending ? 0.75 : 1,
              fontFamily: 'Cabinet Grotesk',
              boxShadow: `0 8px 24px ${accent}44`,
              marginTop: '4px',
            }}
          >
            {mutation.isPending ? 'Signing in…' : 'Sign in →'}
          </motion.button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0', fontSize: '13px', color: '#94A3B8' }}>
          <span style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
          or
          <span style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
        </div>

        {googleError && (
          <div style={{ marginBottom: '12px', padding: '10px 14px', borderRadius: '12px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '13px' }}>
            {googleError}
          </div>
        )}
        <div id="google-signin-btn" style={{ width: '100%', marginBottom: '8px' }} />

        <p style={{ fontSize: '14px', textAlign: 'center', color: '#475569', marginTop: '12px' }}>
          No account?{' '}
          <Link to={`/register${config.registerRole ? `?role=${config.registerRole}` : ''}`} style={{ color: accent, fontWeight: '700', textDecoration: 'none' }}>
            Create one
          </Link>
        </p>

        {config.altLink && (
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <Link to={config.altLink.to}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '999px', border: `1.5px solid ${accent}30`, background: `${accent}08`, color: accent, fontWeight: '600', textDecoration: 'none', fontSize: '14px' }}>
              {config.altLink.icon} Switch to {config.altLink.label} login
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  )
}
