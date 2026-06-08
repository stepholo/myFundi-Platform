import api from './client'

export const bookingsApi = {
  list: (params = {}) =>
    api.get('/bookings/', { params }).then((res) =>
      Array.isArray(res.data) ? res.data : (res.data.results ?? res.data)
    ),
  listPaginated: (params = {}) => api.get('/bookings/', { params }),
  get:  (id)            => api.get(`/bookings/${id}/`),
  create: (data)        => api.post('/bookings/', data),
  update: (id, data)    => api.patch(`/bookings/${id}/`, data),
  destroy: (id)         => api.delete(`/bookings/${id}/`),
  cancel: (id)          => api.patch(`/bookings/${id}/cancel/`),

  // Service price list — used for fault/service dropdowns
  getServices: (category = '') =>
    api.get('/bookings/services/', { params: category ? { category } : {} }),
  getService: (id) => api.get(`/bookings/services/${id}/`),

  // Technician actions
  // serviceFaultId is optional — passed when technician updates the fault on acceptance
  accept: (id, amount, serviceFaultId = null) =>
    api.patch(`/bookings/${id}/accept/`, {
      amount,
      ...(serviceFaultId != null && { service_fault: serviceFaultId }),
    }),
  decline: (id)         => api.patch(`/bookings/${id}/decline/`),
  start: (id)           => api.patch(`/bookings/${id}/start/`),
  complete: (id)        => api.patch(`/bookings/${id}/complete/`),
  nearbyTechnicians: (lat, lng, radius = 10) =>
    api.get('/bookings/technician-locations/nearby/', { params: { latitude: lat, longitude: lng, radius_km: radius } }),
  trackTechnician: (userUuid) =>
    api.get(`/bookings/technician-locations/track/${userUuid}/`),
}
