import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQuery } from '@tanstack/react-query'
import { bookingsApi } from '../../api/bookings'

// ── Category definitions (all 13) ─────────────────────────────────────────────
const CATEGORIES = [
  { value: 'Electrical',       icon: '⚡', img: '/images/icons/electrical.png', bg: 'linear-gradient(135deg,#FEF9C3,#FDE68A)', desc: 'Wiring, sockets, lighting, fans' },
  { value: 'Plumbing',         icon: '🚿', img: '/images/icons/plumbing.png',   bg: 'linear-gradient(135deg,#EFF6FF,#BFDBFE)', desc: 'Pipes, drains, taps, bathrooms, water heaters' },
  { value: 'Fridge Repair',    icon: '🧊', img: '/images/icons/other.png',      bg: 'linear-gradient(135deg,#E0F2FE,#BAE6FD)', desc: 'Fridge & refrigerator repairs' },
  { value: 'Washing Machine',  icon: '🫧', img: '/images/icons/other.png',      bg: 'linear-gradient(135deg,#F0F9FF,#E0F2FE)', desc: 'Washing machine repair & installation' },
  { value: 'Cooker & Oven',    icon: '🍳', img: '/images/icons/other.png',      bg: 'linear-gradient(135deg,#FFF7ED,#FDDCAE)', desc: 'Cookers, ovens, microwaves, gas' },
  { value: 'Television',       icon: '📺', img: '/images/icons/other.png',      bg: 'linear-gradient(135deg,#F5F3FF,#DDD6FE)', desc: 'TV repair, mounting, DSTV, decoders' },
  { value: 'Security Systems', icon: '🔒', img: '/images/icons/other.png',      bg: 'linear-gradient(135deg,#F0FDF4,#BBF7D0)', desc: 'CCTV, alarms, electric fence, gates' },
  { value: 'Solar & Power',    icon: '☀️', img: '/images/icons/other.png',      bg: 'linear-gradient(135deg,#FEFCE8,#FEF08A)', desc: 'Solar panels, inverters, water heaters' },
  { value: 'Small Appliances', icon: '🔌', img: '/images/icons/other.png',      bg: 'linear-gradient(135deg,#FFF1F2,#FFE4E6)', desc: 'Kettles, irons, blenders, ACs' },
  { value: 'Carpentry',        icon: '🪚', img: '/images/icons/carpentry.png',  bg: 'linear-gradient(135deg,#F0FDF4,#BBF7D0)', desc: 'Doors, furniture, cabinets, roofing' },
  { value: 'Cleaning',         icon: '🧹', img: '/images/icons/cleaning.png',   bg: 'linear-gradient(135deg,#FAF5FF,#E9D5FF)', desc: 'Deep clean, move-in/out, upholstery' },
  { value: 'Other Technical',  icon: '🛠️', img: '/images/icons/other.png',      bg: 'linear-gradient(135deg,#FFF7ED,#FED7AA)', desc: 'WiFi setup, home theatre, DSTV' },
  { value: 'Other',            icon: '❓', img: '/images/icons/other.png',      bg: 'linear-gradient(135deg,#F1F5F9,#E2E8F0)', desc: 'Any other home service' },
]

const baseInput = {
  width: '100%', borderRadius: '8px', padding: '10px 13px',
  fontSize: '14px', outline: 'none',
  background: '#FFFFFF', border: '1px solid #E2E8F0',
  color: '#0F172A', boxSizing: 'border-box', transition: 'border-color 0.15s',
}
const focusOn  = (e) => (e.target.style.borderColor = '#E8501A')
const focusOff = (e) => (e.target.style.borderColor = '#E2E8F0')

function fmt(n) { return Number(n).toLocaleString('en-KE') }

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BookingPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [category,     setCategory]     = useState(params.get('category') || '')
  const [serviceFault, setServiceFault] = useState('')   // selected fault ID (string)
  const [form, setForm] = useState({
    location: '', latitude: '', longitude: '', scheduled_time: '', description: '',
  })
  const [locLoading, setLocLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)

  // Reset fault selection whenever category changes
  useEffect(() => {
    setServiceFault('')
  }, [category])

  useEffect(() => {
    const cat = params.get('category')
    if (cat && CATEGORIES.some(c => c.value === cat)) setCategory(cat)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch service/fault list for the selected category
  const { data: services = [], isFetching: servicesFetching } = useQuery({
    queryKey: ['services', category],
    queryFn: () => bookingsApi.getServices(category).then(r => r.data),
    enabled: !!category,
    staleTime: 5 * 60 * 1000,
  })

  // Find the selected fault object for price display
  const selectedFault = services.find(s => String(s.id) === String(serviceFault)) || null

  const mutation = useMutation({
    mutationFn: (data) => bookingsApi.create(data),
    onSuccess: () => {
      setSuccess(true)
      setTimeout(() => navigate('/customer/bookings'), 1200)
    },
    onError: (err) => {
      const d = err.response?.data
      if (!d) { setError('Booking failed. Please try again.'); return }
      if (typeof d === 'string') { setError(d); return }
      const lines = Object.entries(d).map(([field, msgs]) => {
        const label = field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        return `${label}: ${Array.isArray(msgs) ? msgs[0] : msgs}`
      })
      setError(lines.join('\n'))
    },
  })

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const detectLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported.'); return }
    setLocLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude.toFixed(8)
        const lng = pos.coords.longitude.toFixed(8)
        let locationName = ''
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          )
          const data = await res.json()
          const a = data.address || {}
          locationName = [a.road, a.suburb, a.city || a.town || a.village, a.country]
            .filter(Boolean).join(', ')
        } catch { /* silently ignore */ }
        setForm(f => ({ ...f, latitude: lat, longitude: lng, location: f.location || locationName }))
        setLocLoading(false)
      },
      () => { setError('Could not detect location. Enter manually.'); setLocLoading(false) },
      { timeout: 8000 },
    )
  }

  const submit = (e) => {
    e.preventDefault()
    setError('')
    if (!category)            { setError('Please select a service category first.'); return }
    if (!form.location)       { setError('Location is required.'); return }
    if (!form.scheduled_time) { setError('Please choose a scheduled time.'); return }
    mutation.mutate({
      service_category: category,
      service_fault:    serviceFault ? Number(serviceFault) : undefined,
      location:         form.location,
      latitude:         form.latitude   || undefined,
      longitude:        form.longitude  || undefined,
      scheduled_time:   form.scheduled_time,
      description:      form.description || undefined,
    })
  }

  const minDateTime   = new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16)
  const selectedCat   = CATEGORIES.find(c => c.value === category)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>

      {/* Topbar */}
      <div style={{
        height: '60px', background: 'var(--ink2)', borderBottom: '1px solid var(--border2)',
        display: 'flex', alignItems: 'center', padding: '0 28px', gap: '16px',
        flexShrink: 0, position: 'sticky', top: 0, zIndex: 100,
      }}>
        <button
          onClick={() => navigate('/customer/dashboard')}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '20px', cursor: 'pointer', padding: '4px' }}
        >←</button>
        <span style={{ fontFamily: 'Clash Display', fontSize: '17px', fontWeight: '600', color: 'var(--white)' }}>
          Book a Service
        </span>
      </div>

      <div className="responsive-split" style={{ flex: 1, minHeight: 0 }}>

        {/* ── Left: category picker ─────────────────────────────────── */}
        <div className="split-panel sidebar" style={{ overflowY: 'auto', padding: '24px 20px', background: 'var(--ink)' }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontFamily: 'Clash Display', fontSize: '18px', fontWeight: '700', color: 'var(--white)', marginBottom: '4px' }}>
              What do you need?
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.5' }}>
              Choose the service that best matches your issue.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {CATEGORIES.map((cat, i) => {
              const isSelected = category === cat.value
              return (
                <motion.div
                  key={cat.value}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ scale: 1.03, translateY: -3 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { setCategory(cat.value); setError('') }}
                  style={{
                    borderRadius: '16px', cursor: 'pointer', overflow: 'hidden',
                    border: `2px solid ${isSelected ? '#E8501A' : 'transparent'}`,
                    boxShadow: isSelected ? '0 0 0 3px rgba(232,80,26,0.2)' : '0 2px 8px rgba(0,0,0,0.15)',
                    transition: 'all 0.18s',
                  }}
                >
                  <div style={{ background: cat.bg, padding: '14px 12px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', marginBottom: '6px' }}>{cat.icon}</div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#1B2D5E', marginBottom: '2px' }}>{cat.value}</div>
                    <div style={{ fontSize: '9px', color: '#64748B', lineHeight: '1.4' }}>{cat.desc}</div>
                  </div>
                  {isSelected && (
                    <div style={{ background: '#E8501A', padding: '3px', textAlign: 'center' }}>
                      <span style={{ fontSize: '10px', color: '#FFFFFF', fontWeight: '700' }}>✓ Selected</span>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* ── Right: form ──────────────────────────────────────────── */}
        <div className="split-panel" style={{ flex: 1, overflowY: 'auto', background: 'var(--ink)', padding: '24px 28px 60px' }}>
          <AnimatePresence mode="wait">
            {!category ? (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', textAlign: 'center', padding: '40px' }}
              >
                <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}>
                  <div style={{ fontSize: '60px', marginBottom: '16px', opacity: 0.5 }}>🔧</div>
                </motion.div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--white)', marginBottom: '6px' }}>Pick a service first</div>
                <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Select a category on the left to continue</div>
              </motion.div>
            ) : success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}
              >
                <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
                <div style={{ fontFamily: 'Clash Display', fontSize: '22px', fontWeight: '700', color: 'var(--white)', marginBottom: '8px' }}>
                  Booking submitted!
                </div>
                <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '6px' }}>
                  A quotation has been sent to your email.
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Redirecting to your bookings…</div>
              </motion.div>
            ) : (
              <motion.div
                key={category}
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}
              >
                {/* Category pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 14px', borderRadius: '20px', background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                    <span style={{ fontSize: '16px' }}>{selectedCat?.icon}</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#E8501A' }}>{selectedCat?.value}</span>
                  </div>
                </div>

                <div style={{ fontFamily: 'Clash Display', fontSize: '18px', fontWeight: '700', color: 'var(--white)', marginBottom: '4px' }}>
                  Job details
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px', lineHeight: '1.5' }}>
                  Select the specific issue and fill in the details.
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ marginBottom: '20px', padding: '12px 14px', borderRadius: '10px', background: 'rgba(255,59,59,0.1)', border: '1px solid rgba(255,59,59,0.3)', color: 'var(--red)', fontSize: '13px', whiteSpace: 'pre-line', lineHeight: '1.7' }}
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                  {/* ── Service / Fault selector ── */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--muted)', marginBottom: '7px' }}>
                      Specific service / fault
                      <span style={{ fontWeight: '400', fontSize: '12px' }}> (optional — helps us quote accurately)</span>
                    </label>
                    {servicesFetching ? (
                      <div style={{ ...baseInput, color: '#94A3B8' }}>Loading services…</div>
                    ) : services.length === 0 ? (
                      <div style={{ ...baseInput, color: '#94A3B8', background: '#F8FAFC' }}>
                        No specific services listed — a technician will assess on-site
                      </div>
                    ) : (
                      <select
                        value={serviceFault}
                        onChange={e => setServiceFault(e.target.value)}
                        style={{ ...baseInput, cursor: 'pointer' }}
                        onFocus={focusOn} onBlur={focusOff}
                      >
                        <option value="">— Select the issue / fault —</option>
                        {services.map(s => (
                          <option key={s.id} value={String(s.id)}>
                            {s.fault_name}
                            {s.notes ? ` (${s.notes})` : ''}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Price range preview */}
                    <AnimatePresence>
                      {selectedFault && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          style={{ marginTop: '10px', padding: '12px 16px', borderRadius: '10px', background: '#F0FDF4', border: '1px solid #BBF7D0' }}
                        >
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                            Estimated Cost
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                              <div style={{ fontSize: '10px', color: '#64748B', marginBottom: '2px' }}>Site Assessment</div>
                              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>KSh 500 – 1,500</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '10px', color: '#64748B', marginBottom: '2px' }}>Labor (company bill)</div>
                              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>
                                KSh {fmt(selectedFault.company_bill_min)} – {fmt(selectedFault.company_bill_max)}
                                {selectedFault.notes && <span style={{ fontSize: '11px', color: '#64748B' }}> /{selectedFault.notes}</span>}
                              </div>
                            </div>
                          </div>
                          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #BBF7D0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#15803D' }}>Total estimate</span>
                            <span style={{ fontSize: '15px', fontWeight: '700', color: '#15803D' }}>
                              KSh {fmt(500 + Number(selectedFault.company_bill_min))} – {fmt(1500 + Number(selectedFault.company_bill_max))}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '6px', lineHeight: '1.5' }}>
                            Final price confirmed by technician after on-site diagnosis. You will receive a PDF quotation by email.
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Location */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--muted)', marginBottom: '7px' }}>
                      Location / Address *
                    </label>
                    <input
                      name="location" value={form.location} onChange={handle}
                      placeholder="e.g. Westlands, Nairobi — flat 4B"
                      required style={baseInput} onFocus={focusOn} onBlur={focusOff}
                    />
                  </div>

                  {/* GPS */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', fontWeight: '500', color: 'var(--muted)', marginBottom: '7px' }}>
                      <span>GPS Coordinates <span style={{ fontWeight: '400', fontSize: '12px' }}>(helps find nearest tech)</span></span>
                      <button
                        type="button" onClick={detectLocation} disabled={locLoading}
                        style={{ background: 'none', border: '1px solid var(--border2)', borderRadius: '6px', color: 'var(--volt)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: '3px 10px', opacity: locLoading ? 0.6 : 1 }}
                      >
                        {locLoading ? 'Detecting…' : '📍 Detect'}
                      </button>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <input name="latitude" value={form.latitude} onChange={handle} placeholder="Latitude e.g. -1.2921" style={baseInput} onFocus={focusOn} onBlur={focusOff} />
                      <input name="longitude" value={form.longitude} onChange={handle} placeholder="Longitude e.g. 36.8219" style={baseInput} onFocus={focusOn} onBlur={focusOff} />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--muted)', marginBottom: '7px' }}>
                      Describe the problem <span style={{ fontWeight: '400', fontSize: '12px' }}>(helps the technician)</span>
                    </label>
                    <textarea
                      name="description" value={form.description} onChange={handle}
                      placeholder="e.g. Fridge is not cooling — it runs but the interior stays warm. Noticed since yesterday."
                      rows={3} style={{ ...baseInput, resize: 'vertical', lineHeight: '1.6' }}
                      onFocus={focusOn} onBlur={focusOff}
                    />
                  </div>

                  {/* Scheduled time */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--muted)', marginBottom: '7px' }}>
                      When do you need this? *
                    </label>
                    <input
                      type="datetime-local" name="scheduled_time" value={form.scheduled_time} onChange={handle}
                      min={minDateTime} required
                      style={{ ...baseInput, colorScheme: 'light' }}
                      onFocus={focusOn} onBlur={focusOff}
                    />
                  </div>

                  {/* Summary card */}
                  {(form.location || form.scheduled_time || serviceFault) && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      style={{ background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Booking Summary
                      </div>
                      <SummaryRow icon={selectedCat?.icon} label="Service" value={selectedCat?.value} />
                      {selectedFault && (
                        <SummaryRow icon="🔧" label="Fault" value={selectedFault.fault_name} />
                      )}
                      {selectedFault && (
                        <SummaryRow
                          icon="💰" label="Est. Cost"
                          value={`KSh ${fmt(500 + Number(selectedFault.company_bill_min))} – ${fmt(1500 + Number(selectedFault.company_bill_max))}`}
                        />
                      )}
                      {form.location && <SummaryRow icon="📍" label="Location" value={form.location} />}
                      {form.scheduled_time && (
                        <SummaryRow
                          icon="🗓" label="Scheduled"
                          value={new Date(form.scheduled_time).toLocaleString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        />
                      )}
                      {form.description && (
                        <SummaryRow icon="📝" label="Description" value={form.description.slice(0, 80) + (form.description.length > 80 ? '…' : '')} />
                      )}
                    </motion.div>
                  )}

                  <motion.button
                    type="submit" disabled={mutation.isPending}
                    whileHover={{ translateY: -2 }} whileTap={{ scale: 0.98 }}
                    style={{ width: '100%', padding: '14px', borderRadius: '10px', border: 'none', background: 'var(--volt)', color: '#FFFFFF', fontSize: '15px', fontWeight: '700', fontFamily: 'Cabinet Grotesk', cursor: mutation.isPending ? 'not-allowed' : 'pointer', opacity: mutation.isPending ? 0.6 : 1 }}
                  >
                    {mutation.isPending ? 'Submitting…' : 'Request Technician →'}
                  </motion.button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function SummaryRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {label}{' '}
        </span>
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--white)' }}>{value}</span>
      </div>
    </div>
  )
}
