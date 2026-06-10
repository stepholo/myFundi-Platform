import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/utils'
import { server } from '../../test/server'
import LoginPage from './LoginPage'
import useAuthStore from '../../store/authStore'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

beforeEach(() => {
  mockNavigate.mockReset()
  localStorage.clear()
  useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false })
})

describe('LoginPage', () => {
  it('renders username and password inputs', () => {
    const { container } = renderWithProviders(<LoginPage />)
    expect(container.querySelector('input[name="username"]')).toBeInTheDocument()
    expect(container.querySelector('input[name="password"]')).toBeInTheDocument()
  })

  it('renders the sign in button', () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('redirects to customer dashboard on successful customer login', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(<LoginPage />)

    await user.type(container.querySelector('input[name="username"]'), 'alice')
    await user.type(container.querySelector('input[name="password"]'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/customer/dashboard')
    })
  })

  it('stores access token in authStore after successful login', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(<LoginPage />)

    await user.type(container.querySelector('input[name="username"]'), 'alice')
    await user.type(container.querySelector('input[name="password"]'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(localStorage.getItem('access_token')).toBe('mock-access-token')
    })
  })

  it('redirects to admin dashboard when role is Admin', async () => {
    server.use(
      http.post('/api/v1/accounts/login/', () =>
        HttpResponse.json({ access: 'admin-token', refresh: 'ref', role: 'Admin' })
      )
    )
    const user = userEvent.setup()
    const { container } = renderWithProviders(<LoginPage />)

    await user.type(container.querySelector('input[name="username"]'), 'admin')
    await user.type(container.querySelector('input[name="password"]'), 'pass')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard')
    })
  })

  it('shows an error message on failed login', async () => {
    server.use(
      http.post('/api/v1/accounts/login/', () =>
        HttpResponse.json({ detail: 'Invalid credentials' }, { status: 401 })
      )
    )
    const user = userEvent.setup()
    const { container } = renderWithProviders(<LoginPage />)

    await user.type(container.querySelector('input[name="username"]'), 'wrong')
    await user.type(container.querySelector('input[name="password"]'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument()
    })
  })

  it('disables the submit button while the request is in-flight', async () => {
    let resolve
    server.use(
      http.post('/api/v1/accounts/login/', () =>
        new Promise((res) => {
          resolve = () => res(HttpResponse.json({ access: 't', refresh: 'r', role: 'Customer' }))
        })
      )
    )
    const user = userEvent.setup()
    const { container } = renderWithProviders(<LoginPage />)

    await user.type(container.querySelector('input[name="username"]'), 'alice')
    await user.type(container.querySelector('input[name="password"]'), 'pass')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    // While request is pending the button should be disabled
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
    })

    resolve()
  })
})
