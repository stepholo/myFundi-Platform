import LoginShell from './LoginShell'

const config = {
  bgColor: 'linear-gradient(135deg, #050A14 0%, #0D1526 60%, #111827 100%)',
  accent:  '#1B2D5E',
  headline:     'Sign in to your technician account',
  roleIcon:     '🔧',
  roleLabel:    'Technician',
  roleSub:      'Accept jobs & earn',
  registerRole: 'Technician',
  altLink: {
    to:       '/login',
    icon:     '🏠',
    label:    'Customer',
    sublabel: 'Book home services',
  },
}

export default function TechnicianLoginPage() {
  return <LoginShell config={config} />
}
