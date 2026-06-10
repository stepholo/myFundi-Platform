import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import useAuthStore from './store/authStore'
import AppNavbar from './components/layout/AppNavbar'
import AppFooter from './components/layout/AppFooter'
import HomePage from './pages/HomePage'
import LoginPage from './pages/auth/LoginPage'
import CustomerLoginPage from './pages/auth/CustomerLoginPage'
import TechnicianLoginPage from './pages/auth/TechnicianLoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import CustomerLayout from './components/layout/CustomerLayout'
import CustomerDashboard from './pages/customer/CustomerDashboard'
import TechnicianLayout from './components/layout/TechnicianLayout'
import TechnicianDashboard from './pages/technician/TechnicianDashboard'
import AvailableJobsPage from './pages/technician/AvailableJobsPage'
import MyJobsPage from './pages/technician/MyJobsPage'
import EarningsPage from './pages/technician/EarningsPage'
import TechnicianSettingsPage from './pages/technician/TechnicianSettingsPage'
import BookingPage from './pages/customer/BookingPage'
import MyBookingsPage from './pages/customer/MyBookingsPage'
import BookingDetailPage from './pages/customer/BookingDetailPage'
import NearbyTechniciansPage from './pages/customer/NearbyTechniciansPage'
import PaymentsPage from './pages/customer/PaymentsPage'
import SettingsPage from './pages/customer/SettingsPage'
import CustomerNotificationsPage from './pages/customer/CustomerNotificationsPage'
import PaymentPage from './pages/PaymentPage'
import AdminLayout from './components/layout/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import TechnicianManagementPage from './pages/admin/TechnicianManagementPage'
import BookingManagementPage from './pages/admin/BookingManagementPage'
import WithdrawalManagementPage from './pages/admin/WithdrawalManagementPage'

/**
 * React app routing and layout wrapper for eFundi.
 *
 * This module defines protected routes, role-based redirects, and the shell
 * that renders the correct layout for each user group.
 */
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

function ProtectedRoute({ children, roles }) {
  // Guard component that redirects anonymous users or users without the required role.
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/login" replace />
  return children
}

function RoleRedirect() {
  // Send authenticated users to the correct dashboard based on their role.
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <HomePage />
  const map = {
    Customer:      '/customer/dashboard',
    Technician:    '/technician/dashboard',
    Admin:         '/admin/dashboard',
    'Super Admin': '/admin/dashboard',
  }
  return <Navigate to={map[user?.role] || '/login'} replace />
}

// Main app shell that renders the layout chrome and route structure.
function AppShell() {
  const { pathname } = useLocation()
  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname === '/register' ||
    pathname === '/verify-email'
  const isDashboard =
    pathname.startsWith('/customer') ||
    pathname.startsWith('/technician') ||
    pathname.startsWith('/admin')

  const showNavbar = !isAuthPage
  const showFooter = !isAuthPage && !isDashboard

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {showNavbar && <AppNavbar />}
      <div style={{ flex: 1 }}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<RoleRedirect />} />
          <Route path="/login" element={<CustomerLoginPage />} />
          <Route path="/login/customer" element={<CustomerLoginPage />} />
          <Route path="/login/technician" element={<TechnicianLoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/payment/:id" element={<PaymentPage />} />

          {/* Customer */}
          <Route path="/customer" element={
            <ProtectedRoute roles={['Customer']}>
              <CustomerLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<CustomerDashboard />} />
            <Route path="book"      element={<BookingPage />} />
            <Route path="bookings"  element={<MyBookingsPage />} />
            <Route path="bookings/:id" element={<BookingDetailPage />} />
            <Route path="nearby"    element={<NearbyTechniciansPage />} />
            <Route path="payments"  element={<PaymentsPage />} />
            <Route path="settings"       element={<SettingsPage />} />
            <Route path="notifications"  element={<CustomerNotificationsPage />} />
          </Route>

          {/* Technician */}
          <Route path="/technician" element={
            <ProtectedRoute roles={['Technician']}>
              <TechnicianLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<TechnicianDashboard />} />
            <Route path="available" element={<AvailableJobsPage />} />
            <Route path="jobs"      element={<MyJobsPage />} />
            <Route path="jobs/:id"  element={<MyJobsPage />} />
            <Route path="earnings"  element={<EarningsPage />} />
            <Route path="settings"  element={<TechnicianSettingsPage />} />
          </Route>

          {/* Admin */}
          <Route path="/admin" element={
            <ProtectedRoute roles={['Admin', 'Super Admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"    element={<AdminDashboard />} />
            <Route path="technicians"  element={<TechnicianManagementPage />} />
            <Route path="bookings"     element={<BookingManagementPage />} />
            <Route path="withdrawals"  element={<WithdrawalManagementPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {showFooter && <AppFooter />}
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
