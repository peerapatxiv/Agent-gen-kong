import { describe, expect, it } from 'vitest'
import { parseTicket } from '@/parser/ticketParser'
import { generateFormatA } from '@/generators/formatA'
import { generateFormatB } from '@/generators/formatB'
import { checkYamlSyntax, validateFormatAYaml, validateFormatBYaml } from './yaml'

const ticket = `[External GW] | Add Scope to EXT-GW

PUT /v2/profiles/personalized-settings/ext
Required Scope: oob, prelogin

POST /v2/profiles/personalized-settings/inquiry/ext
Required Scope: oob, prelogin`

describe('checkYamlSyntax', () => {
  it('accepts valid YAML', () => {
    const { routes } = parseTicket(ticket)
    expect(checkYamlSyntax(generateFormatA(routes)).valid).toBe(true)
    expect(checkYamlSyntax(generateFormatB(routes)).valid).toBe(true)
  })

  it('rejects invalid YAML', () => {
    expect(checkYamlSyntax('- name: "unterminated').valid).toBe(false)
  })
})

describe('validateFormatAYaml', () => {
  it('validates a correct Format A document', () => {
    const { routes } = parseTicket(ticket)
    const result = validateFormatAYaml(generateFormatA(routes), routes)
    expect(result.valid).toBe(true)
  })

  it('flags a document missing enabled: true', () => {
    const { routes } = parseTicket(ticket)
    const bad = generateFormatA(routes).replace('enabled: true', 'enabled: false')
    const result = validateFormatAYaml(bad, routes)
    expect(result.valid).toBe(false)
  })
})

describe('validateFormatBYaml', () => {
  it('validates a correct Format B document', () => {
    const { routes } = parseTicket(ticket)
    const result = validateFormatBYaml(generateFormatB(routes), routes)
    expect(result.valid).toBe(true)
  })

  it('flags a document with a stray plugins key', () => {
    const { routes } = parseTicket(ticket)
    const bad = generateFormatB(routes).replace(
      /- name: '(.+)'\n/,
      `- name: '$1'\n  plugins: [ ValidateToken ]\n`,
    )
    const result = validateFormatBYaml(bad, routes)
    expect(result.valid).toBe(false)
  })
})
