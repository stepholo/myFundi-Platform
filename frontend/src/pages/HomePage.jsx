import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useMediaQuery } from '../hooks/useMediaQuery'

const ORANGE = '#FF9A3C'
const BRAND  = '#E8501A'

const SERVICES = [
  { img: '/images/icons/electrical.png', label: 'Electrical', desc: 'Wiring, socket installations & electrical repairs'  },
  { img: '/images/icons/plumbing.png',   label: 'Plumbing',   desc: 'Pipe leaks, fittings & drainage solutions'          },
  { img: '/images/icons/carpentry.png',  label: 'Carpentry',  desc: 'Furniture, doors, shelves & custom woodwork'        },
  { img: '/images/icons/cleaning.png',   label: 'Cleaning',   desc: 'Deep cleaning for homes, offices & rentals'         },
  { img: '/images/icons/other.png',      label: 'Other',      desc: 'Handyman, assembly & miscellaneous repairs'         },
]

const STEPS = [
  { n: '01', img: '/images/how-it-works/step-1-request.png',
    title: 'Post your request',     desc: 'Describe what you need and drop your location. Takes under 60 seconds.' },
  { n: '02', img: '/images/how-it-works/step-2-verified.png',
    title: 'Get matched instantly', desc: 'Our system broadcasts your job to verified technicians near you in real time.' },
  { n: '03', img: '/images/how-it-works/step-3-complete.png',
    title: 'Pay securely via M-Pesa', desc: 'Once the job is done to your satisfaction, pay directly from your phone.' },
]

const FEATURES = [
  { img: '/images/technicians/electrician-man.png',  cover: true,  title: 'Verified technicians',
    desc: 'Every technician is identity-checked and admin-approved before going live on the platform.' },
  { img: '/images/empty-states/no-technicians.png', cover: false, title: 'GPS-based matching',
    desc: 'Jobs are broadcast only to technicians who are actually near your location.' },
  { img: '/images/empty-states/no-payments.png',    cover: false, title: 'M-Pesa payments',
    desc: "Pay straight from your phone with Kenya's most trusted mobile wallet." },
  { img: '/images/customer-booking.png',            cover: true,  title: 'Real-time tracking',
    desc: 'Watch job status update live — from requested to assigned to completed.' },
]

const STATS = [
  { value: '300+',  label: 'Technicians'    },
  { value: '1k+',   label: 'Jobs completed' },
  { value: '4.8★',  label: 'Average rating' },
  { value: '< 15m', label: 'Match time'     },
]

const TESTIMONIALS = [
  {
    name: 'Amina Wanjiku', role: 'Homeowner, Nairobi', rating: 5,
    text: 'I had a plumbing emergency at 7 am and within 20 minutes a technician was at my door. The whole process — booking, tracking, and paying — was completely seamless.',
  },
  {
    name: 'James Otieno', role: 'Property Manager, Mombasa', rating: 5,
    text: 'Managing repairs across multiple units used to be a nightmare. eFundi has changed that entirely. The technicians are professional, punctual, and the platform is incredibly easy to use.',
  },
  {
    name: 'Faith Njeri', role: 'Business Owner, Kisumu', rating: 5,
    text: 'The M-Pesa integration is a game changer. No carrying cash, no awkward negotiations — you see the price, the work gets done, and you pay. Simple.',
  },
  {
    name: 'David Kimani', role: 'Customer, Nairobi', rating: 3.5,
    text: 'The service was good overall, but there was a slight delay in the technician arriving. Still, the work was done well.'
  },
  {
    name: 'Grace Achieng', role: 'Customer, Eldoret', rating: 4,
    text: 'I was pleased with the service though the technician was a bit late. The platform is user-friendly and the quality of work was satisfactory.'
  }
]


function fadeUp(delay = 0) {
  return {
    initial:     { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0  },
    viewport:    { once: true, margin: '-50px' },
    transition:  { duration: 0.52, delay },
  }
}

function SectionLabel({ text }) {
  return (
    <div style={{ fontSize: '11px', letterSpacing: '2.5px', color: ORANGE, textTransform: 'uppercase', fontFamily: 'DM Mono', marginBottom: '10px' }}>
      {text}
    </div>
  )
}

function Stars({ count = 5 }) {
  return <span style={{ color: '#FBBF24', fontSize: '15px', letterSpacing: '2px' }}>{'★'.repeat(count)}</span>
}

function StepRow({ step, i }) {
  const [hovered, setHovered] = useState(false)
  return (
    <motion.div
      {...fadeUp(i * 0.1)}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ x: 5, borderColor: 'rgba(255,107,26,0.5)' }}
      style={{
        background: 'var(--ink3)', border: '1px solid var(--border2)',
        borderRadius: '16px', padding: '18px 20px', cursor: 'default',
        display: 'flex', alignItems: 'center', gap: '16px',
        transition: 'border-color 0.25s',
      }}
    >
      <div style={{ fontSize: '32px', fontWeight: '800', color: 'rgba(255,107,26,0.22)', lineHeight: 1, flexShrink: 0, width: '38px', textAlign: 'center' }}>
        {step.n}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--white)', marginBottom: '4px' }}>{step.title}</div>
        <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6' }}>{step.desc}</div>
      </div>
      <motion.div animate={{ scale: hovered ? 1.1 : 1 }} transition={{ duration: 0.25 }}
        style={{ width: '50px', height: '50px', flexShrink: 0 }}>
        <img src={step.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.85 }} />
      </motion.div>
    </motion.div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width: 768px)')

  return (
    <div style={{ background: 'var(--ink)', color: 'var(--white)', overflowX: 'hidden' }}>



      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section style={{ minHeight: isMobile ? '100svh' : '92vh', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center' }}>
        <img src="/images/technicians/hero-technician.png" alt="eFundi technician in Nairobi"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
        <div style={{ position: 'absolute', inset: 0, background: isMobile
          ? 'linear-gradient(to top, rgba(11,17,32,0.97) 0%, rgba(11,17,32,0.7) 55%, rgba(11,17,32,0.3) 100%)'
          : 'linear-gradient(to right, rgba(11,17,32,0.94) 0%, rgba(11,17,32,0.75) 55%, rgba(11,17,32,0.35) 100%)', pointerEvents: 'none' }} />
        {!isMobile && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(11,17,32,0.7) 0%, transparent 40%)', pointerEvents: 'none' }} />}

        <div className="hero-content" style={{ position: 'relative', zIndex: 1, maxWidth: isMobile ? '100%' : '680px', width: '100%' }}>
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 16px', borderRadius: '20px', background: 'rgba(255,107,26,0.15)', border: '1px solid rgba(255,107,26,0.35)', fontSize: '13px', color: ORANGE, fontFamily: 'DM Mono', letterSpacing: '0.5px', marginBottom: isMobile ? '16px' : '28px' }}>
            🇰🇪  Built for Kenya · M-Pesa integrated
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            style={{ fontWeight: '800', fontSize: isMobile ? '38px' : 'clamp(40px, 6vw, 78px)', lineHeight: '1.08', marginBottom: isMobile ? '14px' : '22px', letterSpacing: '-1.5px', color: 'rgba(255,255,255,0.92)' }}>
            Book skilled{' '}
            <span style={{ background: 'linear-gradient(135deg, #E8501A, #FF9A3C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              technicians
            </span>
            ,{isMobile ? ' ' : <br />}fast.
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            style={{ fontSize: isMobile ? '15px' : '17px', color: 'rgba(255,255,255,0.72)', lineHeight: '1.65', maxWidth: '460px', marginBottom: isMobile ? '24px' : '36px' }}>
            eFundi connects you with verified, GPS-matched local technicians for electrical, plumbing, carpentry, cleaning, and more — right to your door.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '10px', marginBottom: isMobile ? '24px' : '52px' }}>
            <motion.button whileHover={{ translateY: -2, scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/register?role=Customer')}
              style={{ padding: '14px 26px', borderRadius: '12px', border: 'none', background: ORANGE, color: '#0F172A', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 8px 28px rgba(255,107,26,0.38)' }}>
              Book a service →
            </motion.button>
            <motion.button whileHover={{ translateY: -2, scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/register?role=Technician')}
              style={{ padding: '14px 22px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', color: '#FFFFFF', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
              Join as a technician
            </motion.button>
            <motion.button whileHover={{ translateY: -2 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/login')}
              style={{ padding: '14px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}>
              Log in
            </motion.button>
          </motion.div>

          {/* Stats bar — 4-col on desktop, 2×2 on mobile */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.45 }}
            style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', overflow: 'hidden', width: '100%' }}>
            {STATS.map((s, i) => (
              <div key={s.label} style={{ padding: isMobile ? '14px 16px' : '16px 28px', textAlign: 'center', borderRight: (isMobile ? i % 2 !== 1 : i < STATS.length - 1) ? '1px solid rgba(255,255,255,0.08)' : 'none', borderBottom: isMobile && i < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                <div style={{ fontSize: isMobile ? '20px' : '22px', fontWeight: '800', color: '#FFFFFF', letterSpacing: '-0.5px' }}>{s.value}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontFamily: 'DM Mono', marginTop: '3px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Floating card — desktop only */}
        {!isMobile && (
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8, duration: 0.5 }}
            style={{ position: 'absolute', bottom: '40px', right: '48px', zIndex: 2, background: 'rgba(15,23,42,0.82)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/images/customer-booking.png" alt="" style={{ width: '42px', height: '42px', borderRadius: '10px', objectFit: 'cover' }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#FFFFFF' }}>Job booked in 45 sec</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontFamily: 'DM Mono' }}>Technician on the way ✓</div>
            </div>
          </motion.div>
        )}
      </section>

      {/* ── What we offer (single row of 5) ──────────────────────────────────── */}
      <section id="services" className="section-pad" style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <motion.div {...fadeUp()} style={{ textAlign: 'center', marginBottom: '52px' }}>
          <SectionLabel text="What we offer" />
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: '800', color: 'var(--white)', letterSpacing: '-0.5px' }}>
            Services built for everyday life
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--muted)', marginTop: '12px', maxWidth: '460px', margin: '12px auto 0', lineHeight: '1.65' }}>
            From emergency plumbing to routine cleaning — book any home service in minutes.
          </p>
        </motion.div>

        {isMobile ? (
          /* Mobile: horizontal scroll strip */
          <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', margin: '0 -20px', padding: '0 20px 8px' }}>
            {SERVICES.map((s) => (
              <div key={s.label} onClick={() => navigate('/register?role=Customer')}
                style={{ flexShrink: 0, width: '140px', background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '18px', padding: '22px 14px', textAlign: 'center', cursor: 'pointer' }}>
                <img src={s.img} alt={s.label} style={{ width: '44px', height: '44px', objectFit: 'contain', marginBottom: '12px', borderRadius: '12px' }} />
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--white)', marginBottom: '6px' }}>{s.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: '1.5' }}>{s.desc}</div>
              </div>
            ))}
          </div>
        ) : (
          /* Desktop: 5-column grid */
          <div className="grid-5col">
            {SERVICES.map((s, i) => (
              <motion.div key={s.label} {...fadeUp(i * 0.07)} whileHover={{ translateY: -5, borderColor: 'rgba(255,107,26,0.45)' }}
                onClick={() => navigate('/register?role=Customer')}
                style={{ background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '20px', padding: '30px 18px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}>
                <img src={s.img} alt={s.label} style={{ width: '52px', height: '52px', objectFit: 'contain', marginBottom: '16px', borderRadius: '14px' }} />
                <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--white)', marginBottom: '8px' }}>{s.label}</div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.55' }}>{s.desc}</div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ── FOR CUSTOMERS  |  WHY EFUNDI  (parallel two-column) ─────────────── */}
      <section id="how-it-works" className="section-pad" style={{ background: 'var(--ink2)', borderTop: '1px solid var(--border2)', borderBottom: '1px solid var(--border2)' }}>
        <div className="grid-2col" style={{ maxWidth: '1280px', margin: '0 auto' }}>

          {/* Left — FOR CUSTOMERS */}
          <div>
            <motion.div {...fadeUp()} style={{ marginBottom: '36px' }}>
              <SectionLabel text="For customers" />
              <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: '800', color: 'var(--white)', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                Three steps to a fixed home
              </h2>
              <p style={{ fontSize: '15px', color: 'var(--muted)', marginTop: '10px', lineHeight: '1.65' }}>
                eFundi makes booking a technician as simple as sending a text.
              </p>
            </motion.div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {STEPS.map((step, i) => <StepRow key={step.n} step={step} i={i} />)}
            </div>
            <motion.div {...fadeUp(0.35)} style={{ marginTop: '28px' }}>
              <motion.button
                onClick={() => navigate('/register?role=Customer')}
                whileHover={{ translateY: -2 }} whileTap={{ scale: 0.97 }}
                style={{ padding: '12px 28px', borderRadius: '12px', border: 'none', background: ORANGE, color: '#0F172A', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 6px 22px rgba(255,107,26,0.3)' }}>
                Book a service →
              </motion.button>
            </motion.div>
          </div>

          {/* Vertical divider */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '-36px', top: '8px', bottom: '8px', width: '1px', background: 'var(--border2)' }} />

            {/* Right — WHY EFUNDI */}
            <motion.div {...fadeUp(0.08)} style={{ marginBottom: '36px' }}>
              <SectionLabel text="Why eFundi" />
              <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: '800', color: 'var(--white)', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                Built to earn your trust
              </h2>
              <p style={{ fontSize: '15px', color: 'var(--muted)', marginTop: '10px', lineHeight: '1.65' }}>
                We do the hard work of vetting, matching, and securing every booking.
              </p>
            </motion.div>

            <div className="grid-2col-sm">
              {FEATURES.map((f, i) => (
                <motion.div key={f.title} {...fadeUp(i * 0.08)} whileHover={{ y: -5, borderColor: 'rgba(255,107,26,0.4)', boxShadow: '0 14px 36px rgba(0,0,0,0.22)' }}
                  style={{ background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '18px', overflow: 'hidden', transition: 'border-color 0.2s, box-shadow 0.2s' }}>
                  <div style={{ height: '100px', overflow: 'hidden', position: 'relative', background: 'rgba(255,255,255,0.02)' }}>
                    <img src={f.img} alt={f.title} style={{ width: '100%', height: '100%', objectFit: f.cover ? 'cover' : 'contain', objectPosition: 'center', padding: f.cover ? 0 : '12px' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--ink3) 0%, transparent 55%)', pointerEvents: 'none' }} />
                  </div>
                  <div style={{ padding: '14px 16px 18px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--white)', marginBottom: '5px' }}>{f.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: '1.65' }}>{f.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div {...fadeUp(0.35)} style={{ marginTop: '28px' }}>
              <motion.button
                onClick={() => navigate('/register?role=Customer')}
                whileHover={{ scale: 1.03, translateY: -2 }} whileTap={{ scale: 0.97 }}
                animate={{ boxShadow: ['0 0 0px 0px rgba(255,107,26,0)', '0 0 0px 10px rgba(255,107,26,0.12)', '0 0 0px 0px rgba(255,107,26,0)'] }}
                transition={{ boxShadow: { repeat: Infinity, duration: 2.4, ease: 'easeInOut' } }}
                style={{ padding: '12px 28px', borderRadius: '12px', border: '1px solid rgba(255,107,26,0.35)', background: 'transparent', color: ORANGE, fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
                See all features →
              </motion.button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────────── */}
      <section style={{ padding: isMobile ? '52px 20px' : '90px 0', background: 'var(--ink)', borderTop: '1px solid var(--border2)', borderBottom: '1px solid var(--border2)', overflow: 'hidden' }}>
        <motion.div {...fadeUp()} style={{ textAlign: 'center', marginBottom: isMobile ? '28px' : '52px', padding: isMobile ? '0' : '0 48px' }}>
          <SectionLabel text="Testimonials" />
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 42px)', fontWeight: '800', color: 'var(--white)', letterSpacing: '-0.5px' }}>
            What customers are saying
          </h2>
        </motion.div>

        {isMobile ? (
          /* Mobile: swipeable horizontal scroll */
          <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', margin: '0 -20px', padding: '0 20px 8px' }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} style={{ flexShrink: 0, width: 'calc(85vw)', maxWidth: '320px', scrollSnapAlign: 'start', background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '20px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Stars count={t.rating} />
                <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.7', flex: 1 }}>"{t.text}"</p>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--white)' }}>{t.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted2)', marginTop: '2px', fontFamily: 'DM Mono' }}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Desktop: auto-scrolling marquee */
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '120px', background: 'linear-gradient(to right, var(--ink), transparent)', zIndex: 2, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '120px', background: 'linear-gradient(to left, var(--ink), transparent)', zIndex: 2, pointerEvents: 'none' }} />
            <div className="marquee-track" style={{ display: 'flex', gap: '20px', animation: 'marquee 28s linear infinite', width: 'max-content', paddingBottom: '8px' }}>
              {[...TESTIMONIALS, ...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
                <div key={i} style={{ width: '320px', flexShrink: 0, background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '20px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <Stars count={t.rating} />
                  <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.75', flex: 1 }}>"{t.text}"</p>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--white)' }}>{t.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted2)', marginTop: '2px', fontFamily: 'DM Mono' }}>{t.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <style>{`
          @keyframes marquee {
            0%   { transform: translateX(0); }
            100% { transform: translateX(calc(-340px * ${TESTIMONIALS.length})); }
          }
          .marquee-track:hover { animation-play-state: paused; }
        `}</style>
      </section>

      {/* ── Technician CTA ───────────────────────────────────────────────────── */}
      <section id="technicians" className="section-pad">
        <motion.div {...fadeUp()} className="responsive-split" style={{ maxWidth: '1060px', margin: '0 auto', background: 'linear-gradient(135deg, rgba(255,107,26,0.07) 0%, rgba(255,107,26,0.03) 100%)', border: '1px solid rgba(255,107,26,0.22)', borderRadius: '28px', overflow: 'hidden', position: 'relative' }}>
          <div className="split-panel sidebar" style={{ position: 'relative', minHeight: '340px' }}>
            <img src="/images/technicians/technician-male.png" alt="eFundi technician"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 60%, rgba(15,23,42,0.6) 100%)' }} />
          </div>
          <div className="split-panel" style={{ flex: 1, padding: isMobile ? '28px 24px 36px' : '56px 52px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(255,107,26,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: '800', color: 'var(--white)', marginBottom: '16px', letterSpacing: '-0.5px' }}>Earn with your skills</h2>
            <p style={{ fontSize: '17px', color: 'var(--muted)', lineHeight: '1.7', maxWidth: '460px', marginBottom: '36px' }}>
              Join hundreds of technicians already earning on eFundi. Set your own hours, accept jobs near you, and get paid instantly via M-Pesa.
            </p>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '28px' }}>
              <motion.button whileHover={{ translateY: -2 }} whileTap={{ scale: 0.97 }} onClick={() => navigate('/register?role=Technician')}
                style={{ padding: '14px 34px', borderRadius: '12px', border: 'none', background: ORANGE, color: '#0F172A', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 6px 24px rgba(255,107,26,0.28)' }}>
                Apply as a technician →
              </motion.button>
              <motion.button whileHover={{ translateY: -2 }} whileTap={{ scale: 0.97 }} onClick={() => navigate('/login/technician')}
                style={{ padding: '14px 28px', borderRadius: '12px', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--muted)', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
                Already registered? Log in
              </motion.button>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted2)', fontFamily: 'DM Mono' }}>
              Questions?{' '}
              <a href="mailto:efundiz01@gmail.com" style={{ color: ORANGE, textDecoration: 'none' }}>efundiz01@gmail.com</a>
              {' '}·{' '}
              <a href="tel:+254799160014" style={{ color: 'var(--muted)', textDecoration: 'none' }}>+254 799 160 014</a>
            </div>
          </div>
        </motion.div>
      </section>


    </div>
  )
}
