import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '../../api/auth'
import usePageTitle from '../../hooks/usePageTitle'

const ACCENT = '#E8501A'

const cardStyle = {
  background: '#FFFFFF', borderRadius: '20px',
  border: '1px solid #E2E8F0',
  boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
  padding: '48px 40px', textAlign: 'center',
}

const inputStyle = {
  width: '100%', padding: '14px 16px', borderRadius: '12px',
  border: '1.5px solid #CBD5E1', background: '#FFFFFF',
  fontSize: '15px', color: '#0F172A', outline: 'none',
  fontFamily: 'Cabinet Grotesk', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '32px' }}>
      <img src="/efundi_icon.svg" width="40" height="40" alt="eFundi" style={{ borderRadius: '8px' }} />
      <span style={{ fontFamily: 'Clash Display', fontSize: '22px', fontWeight: '700', color: '#1B2D5E' }}>
        <span style={{ color: ACCENT }}>e</span>Fundi
      </span>
    </div>
  )
}

function PrimaryButton({ children, ...props }) {
  return (
    <motion.button
      whileHover={{ translateY: -1 }} whileTap={{ scale: 0.98 }}
      style={{
        width: '100%', padding: '13px', borderRadius: '10px', border: 'none',
        background: ACCENT, color: '#FFFFFF', fontSize: '16px',
        fontWeight: '700', fontFamily: 'Cabinet Grotesk',
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.7 : 1,
      }}
      {...props}
    >
      {children}
    </motion.button>
  )
}

function ErrorBanner({ children }) {
  return (
    <div style={{ marginBottom: '18px', padding: '13px 14px', borderRadius: '14px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '14px', textAlign: 'left' }}>
      {children}
    </div>
  )
}

// ── Request a reset link (no uid/token in URL) ─────────────────────────────
function RequestResetForm() {
  const [email, setEmail] = useState('')

  const mutation = useMutation({
    mutationFn: () => authApi.forgotPassword(email),
  })

  const submit = (e) => {
    e.preventDefault()
    mutation.mutate()
  }

  if (mutation.isSuccess) {
    return (
      <>
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          background: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '32px', margin: '0 auto 24px',
        }}>
          📬
        </div>
        <h2 style={{ fontFamily: 'Clash Display', fontSize: '22px', fontWeight: '700', color: '#0F172A', marginBottom: '10px' }}>
          Check your email
        </h2>
        <p style={{ fontSize: '16px', color: '#64748B', marginBottom: '32px', lineHeight: '1.6' }}>
          If an account exists for <strong>{email}</strong>, we've sent a link to reset your password.
        </p>
        <Link to="/login" style={{ color: ACCENT, fontWeight: '700', textDecoration: 'none', fontSize: '15px' }}>
          ← Back to Login
        </Link>
      </>
    )
  }

  return (
    <>
      <h2 style={{ fontFamily: 'Clash Display', fontSize: '22px', fontWeight: '700', color: '#0F172A', marginBottom: '10px' }}>
        Forgot your password?
      </h2>
      <p style={{ fontSize: '15px', color: '#64748B', marginBottom: '28px', lineHeight: '1.6' }}>
        Enter the email address linked to your account and we'll send you a link to reset your password.
      </p>

      {mutation.isError && (
        <ErrorBanner>Something went wrong. Please check your connection and try again.</ErrorBanner>
      )}

      <form onSubmit={submit} style={{ display: 'grid', gap: '16px', textAlign: 'left' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>
            Email address
          </label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com" required style={inputStyle}
            onFocus={e => { e.target.style.borderColor = ACCENT }}
            onBlur={e => { e.target.style.borderColor = '#CBD5E1' }}
          />
        </div>
        <PrimaryButton type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Sending…' : 'Send reset link'}
        </PrimaryButton>
      </form>

      <p style={{ fontSize: '14px', textAlign: 'center', color: '#475569', marginTop: '24px' }}>
        Remembered your password?{' '}
        <Link to="/login" style={{ color: ACCENT, fontWeight: '700', textDecoration: 'none' }}>
          Sign in →
        </Link>
      </p>
    </>
  )
}

// ── Set a new password (uid/token present in URL) ──────────────────────────
function ConfirmResetForm({ uid, token }) {
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [validationError, setValidationError] = useState('')

  const mutation = useMutation({
    mutationFn: () => authApi.resetPassword(uid, token, password),
  })

  const submit = (e) => {
    e.preventDefault()
    setValidationError('')
    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters long.')
      return
    }
    if (password !== confirm) {
      setValidationError('Passwords do not match.')
      return
    }
    mutation.mutate()
  }

  if (mutation.isSuccess) {
    return (
      <>
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px', margin: '0 auto 24px',
          }}
        >
          ✓
        </motion.div>
        <h2 style={{ fontFamily: 'Clash Display', fontSize: '24px', fontWeight: '700', color: '#0F172A', marginBottom: '10px' }}>
          Password reset!
        </h2>
        <p style={{ fontSize: '16px', color: '#64748B', marginBottom: '32px', lineHeight: '1.6' }}>
          Your password has been updated. You can now sign in with your new password.
        </p>
        <Link to="/login" style={{ textDecoration: 'none' }}>
          <PrimaryButton type="button">Go to Login →</PrimaryButton>
        </Link>
      </>
    )
  }

  const apiError = mutation.error?.response?.data
  const apiErrorMessage = apiError?.error
    || apiError?.new_password?.[0]
    || apiError?.non_field_errors?.[0]
    || (mutation.isError ? 'Could not reset your password. The link may have expired.' : '')

  return (
    <>
      <h2 style={{ fontFamily: 'Clash Display', fontSize: '22px', fontWeight: '700', color: '#0F172A', marginBottom: '10px' }}>
        Set a new password
      </h2>
      <p style={{ fontSize: '15px', color: '#64748B', marginBottom: '28px', lineHeight: '1.6' }}>
        Choose a new password for your account.
      </p>

      {(validationError || apiErrorMessage) && (
        <ErrorBanner>{validationError || apiErrorMessage}</ErrorBanner>
      )}

      <form onSubmit={submit} style={{ display: 'grid', gap: '16px', textAlign: 'left' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>
            New password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'} value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" required style={{ ...inputStyle, paddingRight: '44px' }}
              onFocus={e => { e.target.style.borderColor = ACCENT }}
              onBlur={e => { e.target.style.borderColor = '#CBD5E1' }}
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: '17px', padding: '2px', lineHeight: 1 }}
              aria-label={showPw ? 'Hide password' : 'Show password'}>{showPw ? '🙈' : '👁️'}</button>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>
            Confirm new password
          </label>
          <input
            type={showPw ? 'text' : 'password'} value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••" required style={inputStyle}
            onFocus={e => { e.target.style.borderColor = ACCENT }}
            onBlur={e => { e.target.style.borderColor = '#CBD5E1' }}
          />
        </div>

        <PrimaryButton type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Resetting…' : 'Reset password'}
        </PrimaryButton>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
  usePageTitle('Reset Password')
  const [params] = useSearchParams()
  const uid   = params.get('uid')
  const token = params.get('token')

  return (
    <div style={{
      minHeight: '100vh', background: '#F7F8FC',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ width: '100%', maxWidth: '440px' }}
      >
        <div style={cardStyle}>
          <Logo />
          {uid && token ? <ConfirmResetForm uid={uid} token={token} /> : <RequestResetForm />}
        </div>
      </motion.div>
    </div>
  )
}
