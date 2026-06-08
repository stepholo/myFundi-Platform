import LoginShell from './LoginShell'

const config = {
  bgColor: 'linear-gradient(135deg, #1B2D5E 0%, #0E1A3D 65%, #2C1A10 100%)',
  accent:  '#E8501A',
  headline:     'Sign in to book a service',
  roleIcon:     '🏠',
  roleLabel:    'Customer',
  roleSub:      'Book home services',
  registerRole: 'Customer',
  altLink: {
    to:       '/login/technician',
    icon:     '🔧',
    label:    'Technician',
    sublabel: 'Accept jobs & earn',
  },
}

export default function CustomerLoginPage() {
  return <LoginShell config={config} />
}
