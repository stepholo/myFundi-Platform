import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useMediaQuery } from '../hooks/useMediaQuery'

const ORANGE = '#FF9A3C'
const BRAND  = '#E8501A'

const SERVICES = [
  { icon: '⚡', label: 'Electrical', desc: 'Wiring, sockets, lighting & fans', items: [
    'Single socket install / replace', 'Multiple socket (3–5 points)', 'Switch replacement',
    'Lighting fitting / bulb install', 'Fan installation (ceiling / stand)', 'Flickering / dead outlet fault',
    'Circuit breaker (MCB) replace', 'Distribution board (DB) upgrade', 'Earthing / grounding system',
    'House rewiring (1-bed flat)', 'Full house wiring (3-bed new build)', 'Generator / inverter installation',
  ] },
  { icon: '🚿', label: 'Plumbing', desc: 'Pipes, drains, taps, bathrooms & water heaters', items: [
    'Tap leak / washer replace', 'Tap full replacement', 'Under-sink pipe / waste repair',
    'Sink / basin installation', 'Blocked drain (kitchen / bathroom)', 'Sewer / main drain blockage',
    'Fixture leak (toilet / sink)', 'Burst pipe repair (accessible)', 'Pipe installation (new run)',
    'Emergency plumbing (24/7)', 'Toilet cistern fix / running toilet', 'Toilet full replacement',
    'Toilet seat replacement', 'Shower installation (electric)', 'Shower mixer / valve replace',
    'Shower head replacement', 'Electric / instant shower repair', 'Low water pressure fix',
    'Water tank install (plastic, rooftop)', 'Booster pump install', 'Water pump repair / service',
    'Geyser / storage water heater install', 'Water heater repair', 'Water tank cleaning',
  ] },
  { icon: '🧊', label: 'Fridge Repair', desc: 'Cooling faults, gas refills & compressors', items: [
    'Diagnostic / site assessment', 'Coil cleaning', 'Thermostat repair', 'Door gasket / seal replacement',
    'Gas refilling / refrigerant recharge', 'Refrigerant leak seal + recharge', 'Relay / overload protector replace',
    'Control / PCB board repair', 'Compressor replacement', 'Ice maker / freezer section fix',
  ] },
  { icon: '🫧', label: 'Washing Machine', desc: 'Repairs, installation & servicing', items: [
    'Diagnostic visit', 'Belt / minor leak', 'Door lock / latch replacement', 'Door seal (drum gasket) replacement',
    'Water pump / drain pump replace', 'Thermostat / heating element', 'Inlet / solenoid valve replace',
    'Control board / PCB repair', 'Motor replacement (full)', 'New machine installation',
  ] },
  { icon: '🍳', label: 'Cooker & Oven', desc: 'Gas, electric, microwave & oven repairs', items: [
    'Microwave — general repair', 'Microwave — not heating fix', 'Electric cooker — minor repair',
    'Electric cooker — heating element', 'Cooker glass top replacement', 'Gas cooker — igniter / spark fix',
    'Gas cooker — burner replacement', 'Gas cooker — gas leak repair', 'Dual-fuel cooker — electrical fault',
    'Built-in oven — heating element', 'Oven — thermostat replacement', 'Water dispenser — full repair',
  ] },
  { icon: '📺', label: 'Television', desc: 'Screen, board & smart TV repairs', items: [
    'TV diagnostic assessment', 'Backlight / LED strip repair', 'Power supply board repair',
    'Motherboard / main board replace', 'T-Con board repair', 'Audio / speaker fix', 'HDMI / USB port repair',
    'Screen / panel replacement', 'TV wall mounting', 'Smart TV software / signal fix',
  ] },
  { icon: '🔒', label: 'Security Systems', desc: 'CCTV, alarms, gates & access control', items: [
    'CCTV — 4-camera home system', 'CCTV — 8-camera system install', 'CCTV — camera repair / replace',
    'CCTV — DVR/NVR setup & config', 'Burglar alarm system install', 'Alarm system repair / service',
    'Electric fence installation', 'Electric fence repair / fault', 'Gate automation — sliding gate',
    'Gate automation — swing gate', 'Intercom system install (home)', 'Access control / smart lock install',
  ] },
  { icon: '☀️', label: 'Solar & Power', desc: 'Solar, inverters & backup power', items: [
    'Solar panel install — small system', 'Solar panel install — medium (3–5 room)', 'Solar water heater install',
    'Inverter / UPS install', 'Solar system fault / repair', 'Electric water heater install',
  ] },
  { icon: '🔌', label: 'Small Appliances', desc: 'Kettles, irons, blenders & AC units', items: [
    'Electric kettle repair', 'Iron box / steam iron repair', 'Blender / food processor repair',
    'Toaster repair', 'Air fryer repair', 'Tumble dryer repair', 'Dishwasher repair',
    'Air conditioner service / repair',
  ] },
  { icon: '🛠️', label: 'Other Technical', desc: 'DSTV, WiFi, doorbells & home tech', items: [
    'DSTV / TV aerial installation', 'DSTV / decoder repair', 'Smart doorbell / video doorbell install',
    'Surge protector / voltage stabilizer', 'Home theatre / soundbar setup', 'WiFi / router / network setup',
    'Outdoor lighting / floodlight install', 'Coffee maker / espresso machine repair',
  ] },
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
    name: 'James Otieno', role: 'Property Manager, Nairobi', rating: 5,
    text: 'Managing repairs across multiple units used to be a nightmare. myFundi Hub has changed that entirely. The technicians are professional, punctual, and the platform is incredibly easy to use.',
  },
  {
    name: 'Faith Njeri', role: 'Business Owner, Nairobi', rating: 5,
    text: 'The M-Pesa integration is a game changer. No carrying cash, no awkward negotiations — you see the price, the work gets done, and you pay. Simple.',
  },
  {
    name: 'David Kimani', role: 'Customer, Nairobi', rating: 3.5,
    text: 'The service was good overall, but there was a slight delay in the technician arriving. Still, the work was done well.'
  },
  {
    name: 'Grace Achieng', role: 'Customer, Nairobi', rating: 4,
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

function ServiceCard({ service, i, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <motion.div
      {...fadeUp(i * 0.06)}
      whileHover={{ translateY: -5, borderColor: 'rgba(255,107,26,0.45)' }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
      style={{
        position: 'relative', zIndex: hovered ? 30 : 1,
        background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '20px',
        padding: '30px 18px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s',
      }}
    >
      <div style={{ fontSize: '40px', lineHeight: 1, marginBottom: '16px' }}>{service.icon}</div>
      <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--white)', marginBottom: '8px' }}>{service.label}</div>
      <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.55' }}>{service.desc}</div>

      {/* Desktop-only hover popup listing what's covered in this category */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            className="service-popup"
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', top: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)',
              width: '260px', maxHeight: '300px', overflowY: 'auto', textAlign: 'left',
              background: '#101A33', border: '1px solid rgba(255,107,26,0.3)', borderRadius: '14px',
              padding: '16px 18px', boxShadow: '0 18px 44px rgba(0,0,0,0.45)',
            }}
          >
            <div style={{ fontSize: '11px', letterSpacing: '1.5px', color: ORANGE, textTransform: 'uppercase', fontFamily: 'DM Mono', marginBottom: '10px' }}>
              What's covered
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {service.items.map(item => (
                <li key={item} style={{ display: 'flex', gap: '8px', fontSize: '12.5px', color: 'var(--muted)', lineHeight: '1.5' }}>
                  <span style={{ color: ORANGE, flexShrink: 0 }}>•</span>{item}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
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
        <img src="/images/technicians/hero-technician.png" alt="myFundi Hub technician in Nairobi"
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
            Built for households and property owners, myFundi Hub connects you with verified, GPS-matched local technicians for electrical, plumbing, and more — right to your door.
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

      {/* ── What we offer (10 specialty categories) ──────────────────────────── */}
      <section id="services" className="section-pad" style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <motion.div {...fadeUp()} style={{ textAlign: 'center', marginBottom: '52px' }}>
          <SectionLabel text="What we offer" />
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: '800', color: 'var(--white)', letterSpacing: '-0.5px' }}>
            Services built for everyday life
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--muted)', marginTop: '12px', maxWidth: '480px', margin: '12px auto 0', lineHeight: '1.65' }}>
            From electrical faults to fridge repairs and solar installs — book any home service in minutes.
          </p>
          {!isMobile && (
            <p style={{ fontSize: '12px', color: 'var(--muted2)', marginTop: '10px', fontFamily: 'DM Mono' }}>
              Hover a service to see what's covered
            </p>
          )}
        </motion.div>

        {isMobile ? (
          /* Mobile: horizontal scroll strip */
          <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', margin: '0 -20px', padding: '0 20px 8px' }}>
            {SERVICES.map((s) => (
              <div key={s.label} onClick={() => navigate('/register?role=Customer')}
                style={{ flexShrink: 0, width: '140px', background: 'var(--ink3)', border: '1px solid var(--border2)', borderRadius: '18px', padding: '22px 14px', textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ fontSize: '34px', lineHeight: 1, marginBottom: '12px' }}>{s.icon}</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--white)', marginBottom: '6px' }}>{s.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: '1.5' }}>{s.desc}</div>
              </div>
            ))}
          </div>
        ) : (
          /* Desktop: 5-column grid, hover a card to see covered items */
          <div className="grid-5col">
            {SERVICES.map((s, i) => (
              <ServiceCard key={s.label} service={s} i={i} onClick={() => navigate('/register?role=Customer')} />
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
                myFundi Hub makes booking a technician as simple as sending a text.
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
              <SectionLabel text="Why myFundi Hub" />
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
            <img src="/images/technicians/technician-male.png" alt="myFundi Hub technician"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 60%, rgba(15,23,42,0.6) 100%)' }} />
          </div>
          <div className="split-panel" style={{ flex: 1, padding: isMobile ? '28px 24px 36px' : '56px 52px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(255,107,26,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: '800', color: 'var(--white)', marginBottom: '16px', letterSpacing: '-0.5px' }}>Earn with your skills</h2>
            <p style={{ fontSize: '17px', color: 'var(--muted)', lineHeight: '1.7', maxWidth: '460px', marginBottom: '36px' }}>
              Join hundreds of technicians already earning on myFundi Hub. Set your own hours, accept jobs near you, and get paid instantly via M-Pesa.
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
              <a href="mailto:myfundihub@gmail.com" style={{ color: ORANGE, textDecoration: 'none' }}>myfundihub@gmail.com</a>
              {' '}·{' '}
              <a href="tel:+254799160014" style={{ color: 'var(--muted)', textDecoration: 'none' }}>+254 799 160 014</a>
            </div>
          </div>
        </motion.div>
      </section>


    </div>
  )
}
