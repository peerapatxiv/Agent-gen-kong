import { describe, expect, it } from 'vitest'
import { parseTicket } from './ticketParser'
import { generateFormatA } from '@/generators/formatA'
import { generateFormatB } from '@/generators/formatB'

describe('Example A — multiple external routes, internal excluded', () => {
  const ticket = `[External GW] | Add Scope to EXT-GW

PUT /v2/profiles/personalized-settings/ext
Required Scope: oob, prelogin

POST /v2/profiles/personalized-settings/inquiry/ext
Required Scope: oob, prelogin

Internal Service rows should be excluded.`

  it('detects exactly 2 external routes and 0 excluded (no internal row present)', () => {
    const result = parseTicket(ticket)
    expect(result.routes).toHaveLength(2)
    expect(result.excludedRoutes).toHaveLength(0)
  })

  it('produces the exact Format A YAML', () => {
    const { routes } = parseTicket(ticket)
    const yamlText = generateFormatA(routes)
    expect(yamlText).toBe(
      `- name: "V2-profiles-personalized-settings-ext-routes"
  paths:
    - "/v2/profiles/personalized-settings/ext"
  methods:
    - "PUT"
  tags: ["profiles", "v2"]
  enabled: true
  plugins:
    - name: "ValidateToken"
      enabled: true
      config:
        scopes:
          - "oob"
          - "prelogin"

- name: "V2-profiles-personalized-settings-inquiry-ext-routes"
  paths:
    - "/v2/profiles/personalized-settings/inquiry/ext"
  methods:
    - "POST"
  tags: ["profiles", "v2"]
  enabled: true
  plugins:
    - name: "ValidateToken"
      enabled: true
      config:
        scopes:
          - "oob"
          - "prelogin"
`,
    )
  })

  it('produces the exact Format B YAML', () => {
    const { routes } = parseTicket(ticket)
    const yamlText = generateFormatB(routes)
    expect(yamlText).toBe(
      `- name: 'V2ProfilesPersonalized-settingsExt-\${{ env "DECK_ENV" }}'
  methods: [ PUT ]
  paths: [ '\${{ env "DECK_ROUTE_PREFIX" }}/v2/profiles/personalized-settings/ext' ]
  hosts: [ 'fec-gateway-\${{ env "DECK_ENV" }}.np.private.azscb.tech', localhost ]
  tags: [ route, '\${{ env "DECK_ENV" }}', project=scb-fasteasy-cloud, kong-ce2, profiles, PUT, scope=oob,prelogin ]

- name: 'V2ProfilesPersonalized-settingsInquiryExt-\${{ env "DECK_ENV" }}'
  methods: [ POST ]
  paths: [ '\${{ env "DECK_ROUTE_PREFIX" }}/v2/profiles/personalized-settings/inquiry/ext' ]
  hosts: [ 'fec-gateway-\${{ env "DECK_ENV" }}.np.private.azscb.tech', localhost ]
  tags: [ route, '\${{ env "DECK_ENV" }}', project=scb-fasteasy-cloud, kong-ce2, profiles, POST, scope=oob,prelogin ]
`,
    )
  })
})

describe('Example A (table variant) — internal service row excluded', () => {
  const ticket = `| API | Method | Required Scope | Generate Scope |
| PUT /v2/profiles/personalized-settings/ext | PUT | oob, prelogin | - |
| Internal Service /v2/profiles/personalized-settings/internal | PUT | oob | - |`

  it('excludes the internal service row', () => {
    const result = parseTicket(ticket)
    expect(result.routes).toHaveLength(1)
    expect(result.excludedRoutes).toHaveLength(1)
    expect(result.excludedRoutes[0].path).toContain('internal')
  })
})

describe('Example B — Generate Scope "-" must not suppress Required Scope', () => {
  const ticket = `[GW-EXT] | Add scope for POST /v1/lending/request-info/commercial/businessAndMarital/inquiry/ext - Jul 2026

Required Scope: oob
Generate Scope: -`

  it('produces the exact Format A YAML with businessAndMarital casing preserved', () => {
    const { routes } = parseTicket(ticket)
    expect(routes).toHaveLength(1)
    const yamlText = generateFormatA(routes)
    expect(yamlText).toBe(
      `- name: "V1-lending-request-info-commercial-businessAndMarital-inquiry-ext-routes"
  paths:
    - "/v1/lending/request-info/commercial/businessAndMarital/inquiry/ext"
  methods:
    - "POST"
  tags: ["lending", "v1"]
  enabled: true
  plugins:
    - name: "ValidateToken"
      enabled: true
      config:
        scopes:
          - "oob"
`,
    )
  })
})

describe('Example C — TokenRevocation, no scope', () => {
  const ticket = `POST /v2/login/revoke
Required Scope: -
Plugin: TokenRevocation`

  it('produces the exact Format A YAML', () => {
    const { routes } = parseTicket(ticket)
    expect(routes).toHaveLength(1)
    const yamlText = generateFormatA(routes)
    expect(yamlText).toBe(
      `- name: "V2-login-revoke-routes"
  paths:
    - "/v2/login/revoke"
  methods:
    - "POST"
  tags: ["revoke", "login"]
  enabled: true
  plugins:
    - name: "TokenRevocation"
      enabled: true
`,
    )
  })

  it('omits the scope= tag in Format B', () => {
    const { routes } = parseTicket(ticket)
    const yamlText = generateFormatB(routes)
    expect(yamlText).not.toContain('scope=')
  })
})

describe('Example D — multiple plugins in order', () => {
  const ticket = `POST /v1/login/resetpin/verifyuser

Plugin: ValidateTokenIfApiAuth
Required Scope:
adddevice_verifyuser
adddevice_otp
prelogin
oob
resetpin_verifyuser
resetpin-pinlock

Plugin: CheckUserStatus

Plugin: GenerateAndStoreToken
Status Codes: 1000
Generate Scope: resetpin_verifyuser`

  it('produces all three plugins in the specified order', () => {
    const { routes } = parseTicket(ticket)
    expect(routes).toHaveLength(1)
    const [route] = routes
    expect(route.plugins.map((p) => p.name)).toEqual(['ValidateTokenIfApiAuth', 'CheckUserStatus', 'GenerateAndStoreToken'])
    expect(route.plugins[0].config?.scopes).toEqual([
      'adddevice_verifyuser',
      'adddevice_otp',
      'prelogin',
      'oob',
      'resetpin_verifyuser',
      'resetpin-pinlock',
    ])
    expect(route.plugins[1].config).toBeUndefined()
    expect(route.plugins[2].config).toEqual({ status_codes: [1000], scopes: ['resetpin_verifyuser'] })
  })
})

describe('Example E — multiple methods', () => {
  const ticket = `/v1/addresses/mailingAddress/goodtoknow

Methods: GET, POST, PUT, DELETE

Required Scope: oob`

  it('produces the exact Format A YAML', () => {
    const { routes } = parseTicket(ticket)
    const yamlText = generateFormatA(routes)
    expect(yamlText).toBe(
      `- name: "V1-addresses-mailingAddress-goodtoknow-routes"
  paths:
    - "/v1/addresses/mailingAddress/goodtoknow"
  methods:
    - "GET"
    - "POST"
    - "PUT"
    - "DELETE"
  tags: ["addresses", "v1"]
  enabled: true
  plugins:
    - name: "ValidateToken"
      enabled: true
      config:
        scopes:
          - "oob"
`,
    )
  })

  it('produces the exact Format B YAML', () => {
    const { routes } = parseTicket(ticket)
    const yamlText = generateFormatB(routes)
    expect(yamlText).toBe(
      `- name: 'V1AddressesMailingaddressGoodtoknow-\${{ env "DECK_ENV" }}'
  methods: [ GET, POST, PUT, DELETE ]
  paths: [ '\${{ env "DECK_ROUTE_PREFIX" }}/v1/addresses/mailingAddress/goodtoknow' ]
  hosts: [ 'fec-gateway-\${{ env "DECK_ENV" }}.np.private.azscb.tech', localhost ]
  tags: [ route, '\${{ env "DECK_ENV" }}', project=scb-fasteasy-cloud, kong-ce2, addresses, GET, POST, PUT, DELETE, scope=oob ]
`,
    )
  })
})

describe('Lending set — two routes, Format B', () => {
  const ticket = `[GW-EXT] | Add scope for POST /v1/lending/referral/verification/ext - Jun 2026

Required Scope: oob

[GW-EXT] | Add scope for POST /v1/lending/introductions/inquiry/ext - Jun 2026

Required Scope: oob`

  it('produces the exact Format B YAML for both routes', () => {
    const { routes } = parseTicket(ticket)
    expect(routes).toHaveLength(2)
    const yamlText = generateFormatB(routes)
    expect(yamlText).toBe(
      `- name: 'V1LendingReferralVerificationExt-\${{ env "DECK_ENV" }}'
  methods: [ POST ]
  paths: [ '\${{ env "DECK_ROUTE_PREFIX" }}/v1/lending/referral/verification/ext' ]
  hosts: [ 'fec-gateway-\${{ env "DECK_ENV" }}.np.private.azscb.tech', localhost ]
  tags: [ route, '\${{ env "DECK_ENV" }}', project=scb-fasteasy-cloud, kong-ce2, lending, POST, scope=oob ]

- name: 'V1LendingIntroductionsInquiryExt-\${{ env "DECK_ENV" }}'
  methods: [ POST ]
  paths: [ '\${{ env "DECK_ROUTE_PREFIX" }}/v1/lending/introductions/inquiry/ext' ]
  hosts: [ 'fec-gateway-\${{ env "DECK_ENV" }}.np.private.azscb.tech', localhost ]
  tags: [ route, '\${{ env "DECK_ENV" }}', project=scb-fasteasy-cloud, kong-ce2, lending, POST, scope=oob ]
`,
    )
  })
})

describe('Duplicate route detection', () => {
  it('warns when the same method+path appears twice', () => {
    const ticket = `POST /v1/lending/referral/verification/ext
Required Scope: oob

POST /v1/lending/referral/verification/ext
Required Scope: oob`
    const { issues } = parseTicket(ticket)
    expect(issues.some((i) => i.message.includes('Duplicate route'))).toBe(true)
  })
})

describe('Missing method', () => {
  it('flags a route with no discoverable method instead of guessing one', () => {
    const ticket = `/v1/lending/referral/verification/ext
Required Scope: oob`
    const { routes, issues } = parseTicket(ticket)
    expect(routes[0].methods).toEqual([])
    expect(routes[0].methodAmbiguous).toBe(true)
    expect(issues.some((i) => i.message.includes('method could not be confidently determined'))).toBe(true)
  })
})

describe('Confluence-style vertical info table (TGP-2214 shape)', () => {
  const ticket = `[GW-EXT][AUG-2026] (NEW) POST /v1/debitcards/resetpin/inquiry/ext

| GW | [External GW] POST /v1/debitcards/resetpin/inquiry/ext |
| Requirements | Add new scope to endpoint. |
| Environment | External GW. |
| Required scopes | oob |
| Generated scopes | - |
| Confluence Link | https://example.atlassian.net/wiki/x/abc123 |
| Story Link | https://example.atlassian.net/browse/RL1-50853 |`

  it('pulls "Required scopes" out of the vertical table and attaches it to the one route found', () => {
    const { routes } = parseTicket(ticket)
    expect(routes).toHaveLength(1)
    expect(routes[0].scopes).toEqual(['oob'])
    const yamlText = generateFormatA(routes)
    expect(yamlText).toBe(
      `- name: "V1-debitcards-resetpin-inquiry-ext-routes"
  paths:
    - "/v1/debitcards/resetpin/inquiry/ext"
  methods:
    - "POST"
  tags: ["debitcards", "v1"]
  enabled: true
  plugins:
    - name: "ValidateToken"
      enabled: true
      config:
        scopes:
          - "oob"
`,
    )
  })
})

describe('Confluence slug link as the only path source (TGP-2236 shape)', () => {
  const ticket = `GW | [External GW] | Add Scope to EXT-GW

Description: Add scope to EXT-GW
Ext/Int: External GW.
Release :  July 26
Epic Ref: https://scbtechx.atlassian.net/browse/RL1-46711
| MS | API | Required Scope | Generated Scope | Remark |
| tiles MS | https://scbtechx.atlassian.net/wiki/spaces/FE/pages/13700235463/DELETE+v1+tiles+transaction-service+settings+ext+-+Jun+2026 | oob, prelogin |  | exclude https://scbtechx.atlassian.net/wiki/spaces/FE/pages/13704725352 |`

  it('recovers the method and path from the slugified Confluence link instead of the wiki URL itself', () => {
    const { routes } = parseTicket(ticket)
    expect(routes).toHaveLength(1)
    expect(routes[0].methods).toEqual(['DELETE'])
    expect(routes[0].path).toBe('/v1/tiles/transaction-service/settings/ext')
    expect(routes[0].scopes).toEqual(['oob', 'prelogin'])
    expect(routes[0].methodAmbiguous).toBe(false)
  })

  it('ignores the unrecognized Remark column entirely — no exclusion, description, or tag leakage', () => {
    const { routes, excludedRoutes } = parseTicket(ticket)
    expect(excludedRoutes).toHaveLength(0)
    expect(routes[0].excluded).toBe(false)
    expect(routes[0].description).toBeUndefined()
    expect(routes[0].tags).toBeUndefined()
  })
})

describe('Missing version', () => {
  it('flags a route with no version segment for manual review', () => {
    const ticket = `POST /auth/fasteasy-login
Required Scope: oob`
    const { routes, issues } = parseTicket(ticket)
    expect(routes[0].versionMissing).toBe(true)
    expect(issues.some((i) => i.message.includes('version segment'))).toBe(true)
  })
})
