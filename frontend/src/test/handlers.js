import { http, HttpResponse } from 'msw'

const BASE = '/api/v1'

export const handlers = [
  // Auth
  http.post(`${BASE}/accounts/login/`, () =>
    HttpResponse.json({
      access: 'mock-access-token',
      refresh: 'mock-refresh-token',
      role: 'Customer',
    })
  ),

  http.post(`${BASE}/accounts/register/`, () =>
    HttpResponse.json({ id: '1', username: 'newuser' }, { status: 201 })
  ),

  http.get(`${BASE}/accounts/users/:userId/`, ({ params }) =>
    HttpResponse.json({
      user_id: params.userId,
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      role: 'Customer',
    })
  ),

  // Bookings
  http.get(`${BASE}/bookings/`, () =>
    HttpResponse.json({
      results: [
        {
          booking_id: 'booking-1',
          service_category: 'Electrical',
          status: 'assigned',
          location: '123 Test St',
          amount: '1000.00',
          scheduled_time: '2026-06-15T10:00:00Z',
        },
      ],
      count: 1,
    })
  ),

  http.post(`${BASE}/bookings/`, () =>
    HttpResponse.json(
      { booking_id: 'new-booking-1', status: 'requested' },
      { status: 201 }
    )
  ),

  // Notifications
  http.get(`${BASE}/notifications/`, () =>
    HttpResponse.json({
      results: [
        { id: 1, title: 'Test notification', message: 'Hello', is_read: false, event_type: 'System' },
      ],
      count: 1,
    })
  ),

  http.patch(`${BASE}/notifications/:id/mark-read/`, ({ params }) =>
    HttpResponse.json({ id: Number(params.id), is_read: true })
  ),

  // Payments
  http.get(`${BASE}/payments/`, () =>
    HttpResponse.json({
      results: [
        { payment_id: 'pay-1', amount: '1000.00', payment_status: 'successful', transaction_reference: 'REF-001' },
      ],
      count: 1,
    })
  ),
]
