import axios from 'axios'

// Unauthenticated client — used for public endpoints like payment links in invoice emails.
// No auth token attached, no 401 redirect to login.
const publicApi = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

export default publicApi
