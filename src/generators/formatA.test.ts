import { describe, expect, it } from 'vitest'
import { parseTicket } from '@/parser/ticketParser'
import { generateFormatA } from './formatA'

describe('GenerateAndStoreTokenBySession serialization', () => {
  it('emits status_code and scope as scalars, not lists', () => {
    const ticket = `POST /v1/fasteasy-login

Plugin: ValidateToken
Required Scope: prelogin, oob

Plugin: GenerateAndStoreTokenBySession
Status Code: 1000
Generate Scope: oob`
    const { routes } = parseTicket(ticket)
    const yamlText = generateFormatA(routes)
    expect(yamlText).toContain(`    - name: "GenerateAndStoreTokenBySession"
      enabled: true
      config:
        status_code: 1000
        scope: "oob"`)
  })
})

describe('No required scope', () => {
  it('omits the scopes block entirely for the default ValidateToken plugin', () => {
    const ticket = `POST /v1/notifications/ack

Required Scope: -`
    const { routes } = parseTicket(ticket)
    const yamlText = generateFormatA(routes)
    expect(yamlText).toBe(
      `- name: "V1-notifications-ack-routes"
  paths:
    - "/v1/notifications/ack"
  methods:
    - "POST"
  tags: ["notifications", "v1"]
  enabled: true
  plugins:
    - name: "ValidateToken"
      enabled: true
`,
    )
    expect(yamlText).not.toContain('config:')
  })
})

describe('Empty route list', () => {
  it('returns an empty string when there are no routes', () => {
    expect(generateFormatA([])).toBe('')
  })
})
