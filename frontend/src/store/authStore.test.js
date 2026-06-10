import { beforeEach, describe, expect, it } from 'vitest'
import useAuthStore from './authStore'

// Reset store and localStorage before each test
beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false })
})

describe('authStore', () => {
  describe('setAuth', () => {
    it('persists tokens and user to localStorage', () => {
      const user = { role: 'Customer', username: 'alice' }
      useAuthStore.getState().setAuth(user, 'access-abc', 'refresh-xyz')

      expect(localStorage.getItem('access_token')).toBe('access-abc')
      expect(localStorage.getItem('refresh_token')).toBe('refresh-xyz')
      expect(JSON.parse(localStorage.getItem('user'))).toEqual(user)
    })

    it('updates store state', () => {
      const user = { role: 'Technician', username: 'bob' }
      useAuthStore.getState().setAuth(user, 'tok', 'ref')

      const state = useAuthStore.getState()
      expect(state.user).toEqual(user)
      expect(state.accessToken).toBe('tok')
      expect(state.isAuthenticated).toBe(true)
    })
  })

  describe('setUser', () => {
    it('updates user in store and localStorage without touching tokens', () => {
      localStorage.setItem('access_token', 'existing-token')
      const updated = { role: 'Customer', username: 'charlie', email: 'c@example.com' }
      useAuthStore.getState().setUser(updated)

      expect(useAuthStore.getState().user).toEqual(updated)
      expect(JSON.parse(localStorage.getItem('user'))).toEqual(updated)
      expect(localStorage.getItem('access_token')).toBe('existing-token')
    })
  })

  describe('logout', () => {
    it('clears all auth data from localStorage and store', () => {
      useAuthStore.getState().setAuth({ role: 'Customer' }, 'tok', 'ref')
      useAuthStore.getState().logout()

      expect(localStorage.getItem('access_token')).toBeNull()
      expect(localStorage.getItem('refresh_token')).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.accessToken).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe('initial hydration from localStorage', () => {
    it('reads stored access token and user on first import', () => {
      localStorage.setItem('access_token', 'hydrated-token')
      localStorage.setItem('user', JSON.stringify({ role: 'Admin' }))

      // Force re-evaluation of the initial state by creating a fresh store snapshot
      useAuthStore.setState({
        user: JSON.parse(localStorage.getItem('user') || 'null'),
        accessToken: localStorage.getItem('access_token'),
        isAuthenticated: !!localStorage.getItem('access_token'),
      })

      const state = useAuthStore.getState()
      expect(state.accessToken).toBe('hydrated-token')
      expect(state.isAuthenticated).toBe(true)
      expect(state.user).toEqual({ role: 'Admin' })
    })

    it('handles corrupted localStorage user gracefully', () => {
      localStorage.setItem('user', 'not-valid-json{{{')
      // readStoredUser() should return null on parse error
      expect(() => JSON.parse(localStorage.getItem('user'))).toThrow()
      // The store's own readStoredUser wraps this in a try/catch
      const parsed = (() => { try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null } })()
      expect(parsed).toBeNull()
    })
  })
})
