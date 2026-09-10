import { describe, expect, it } from 'vitest'
import { parseTicket } from '@/parser/ticketParser'
import { generateFormatB } from './formatB'

describe('Format B standing defaults', () => {
  it('never emits enabled or plugins keys', () => {
    const ticket = `POST /v1/login/resetpin/verifyuser

Plugin: ValidateTokenIfApiAuth
Required Scope: oob

Plugin: CheckUserStatus`
    const { routes } = parseTicket(ticket)
    const yamlText = generateFormatB(routes)
    expect(yamlText).not.toMatch(/^\s*enabled:/m)
    expect(yamlText).not.toMatch(/^\s*plugins:/m)
  })

  it('always uses the exact required hosts', () => {
    const ticket = `POST /v1/login/resetpin/verifyuser
Required Scope: oob`
    const { routes } = parseTicket(ticket)
    const yamlText = generateFormatB(routes)
    expect(yamlText).toContain(`hosts: [ 'fec-gateway-\${{ env "DECK_ENV" }}.np.private.azscb.tech', localhost ]`)
  })

  it('omits the scope= tag when there is no required scope', () => {
    const ticket = `POST /v2/login/revoke
Required Scope: -
Plugin: TokenRevocation`
    const { routes } = parseTicket(ticket)
    const yamlText = generateFormatB(routes)
    expect(yamlText).not.toContain('scope=')
  })
})

describe('Empty route list', () => {
  it('returns an empty string when there are no routes', () => {
    expect(generateFormatB([])).toBe('')
  })
})
