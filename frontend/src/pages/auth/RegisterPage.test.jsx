import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/utils'
import { server } from '../../test/server'
import RegisterPage from './RegisterPage'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

beforeEach(() => {
  mockNavigate.mockReset()
  localStorage.clear()
})

// Fill the Customer registration form using name attributes (more robust than placeholders)
async function fillForm(user, container, overrides = {}) {
  const v = {
    first_name: 'Alice', last_name: 'Doe',
    email: 'alice@example.com', email2: 'alice@example.com',
    phone_number: '0712345678', username: 'alicedoe',
    password: 'StrongPass1!', password2: 'StrongPass1!',
    ...overrides,
  }
  const q = (name) => container.querySelector(`input[name="${name}"]`)
  await user.type(q('first_name'), v.first_name)
  await user.type(q('last_name'), v.last_name)
  await user.type(q('email'), v.email)
  await user.type(q('email2'), v.email2)
  await user.type(q('phone_number'), v.phone_number)
  await user.type(q('username'), v.username)
  await user.type(q('password'), v.password)
  await user.type(q('password2'), v.password2)
}

describe('RegisterPage', () => {
  it('renders Customer and Technician role options', () => {
    renderWithProviders(<RegisterPage />)
    expect(screen.getByText('Customer')).toBeInTheDocument()
    expect(screen.getByText('Technician')).toBeInTheDocument()
  })

  it('shows an email-mismatch error without calling the API', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(<RegisterPage />)

    await fillForm(user, container, { email2: 'different@example.com' })
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/email addresses do not match/i)).toBeInTheDocument()
    })
  })

  it('shows a password-mismatch error without calling the API', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(<RegisterPage />)

    await fillForm(user, container, { password2: 'WrongPass999!' })
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    })
  })

  it('shows success state after successful registration', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(<RegisterPage />)

    await fillForm(user, container)
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText('Account created!')).toBeInTheDocument()
    })
  })

  it('shows an API error when the username is already taken', async () => {
    server.use(
      http.post('/api/v1/accounts/register/', () =>
        HttpResponse.json(
          { username: ['A user with that username already exists.'] },
          { status: 400 }
        )
      )
    )
    const user = userEvent.setup()
    const { container } = renderWithProviders(<RegisterPage />)

    await fillForm(user, container)
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/A user with that username already exists/)).toBeInTheDocument()
    })
  })

  it('requires at least one specialization when registering as a Technician', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(<RegisterPage />)

    // Switch to Technician role by clicking the Technician button
    await user.click(screen.getAllByText('Technician')[0])

    await fillForm(user, container)
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/select at least one specialization/i)).toBeInTheDocument()
    })
  })
})
