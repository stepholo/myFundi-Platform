import { describe, expect, it } from 'vitest'
import { decodeToken } from './auth'

describe('decodeToken', () => {
  const makeJwt = (payload) => {
    const encoded = btoa(JSON.stringify(payload))
    return `header.${encoded}.signature`
  }

  it('decodes a valid JWT payload', () => {
    const payload = { user_id: 'abc-123', role: 'Customer', exp: 9999999999 }
    const token = makeJwt(payload)
    expect(decodeToken(token)).toEqual(payload)
  })

  it('returns null for a malformed token', () => {
    expect(decodeToken('not.a.jwt')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(decodeToken('')).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(decodeToken(undefined)).toBeNull()
  })

  it('returns null when base64 segment is invalid', () => {
    expect(decodeToken('header.!!!invalid!!!.sig')).toBeNull()
  })
})
