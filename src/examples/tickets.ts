export interface ExampleTicket {
  id: string
  title: string
  description: string
  body: string
}

export const EXAMPLE_TICKETS: ExampleTicket[] = [
  {
    id: 'simple-single-scope',
    title: 'Simple route, one scope',
    description: 'A single external route with one required scope.',
    body: `[GW-EXT] | Add scope for POST /v1/login/inquiry - May 2026

Required Scope: oob`,
  },
  {
    id: 'multiple-external-routes',
    title: 'Multiple external routes',
    description: 'Two external routes under the same "Add Scope" ticket.',
    body: `[External GW] | Add Scope to EXT-GW

PUT /v2/profiles/personalized-settings/ext
Required Scope: oob, prelogin

POST /v2/profiles/personalized-settings/inquiry/ext
Required Scope: oob, prelogin

Internal Service rows should be excluded.`,
  },
  {
    id: 'internal-excluded-table',
    title: 'Internal/excluded routes (table)',
    description: 'A Jira table where one row is an internal service and must be skipped.',
    body: `| API | Method | Required Scope | Generate Scope |
| PUT /v2/profiles/personalized-settings/ext | PUT | oob, prelogin | - |
| Internal Service /v2/profiles/personalized-settings/internal | PUT | oob | - |`,
  },
  {
    id: 'no-required-scope',
    title: 'No required scope',
    description: 'A route with an explicit "-" required scope, so no scopes block is generated.',
    body: `POST /v1/notifications/ack

Required Scope: -`,
  },
  {
    id: 'multiple-methods',
    title: 'Multiple methods',
    description: 'A single route that accepts GET, POST, PUT and DELETE.',
    body: `/v1/addresses/mailingAddress/goodtoknow

Methods: GET, POST, PUT, DELETE

Required Scope: oob`,
  },
  {
    id: 'token-revocation',
    title: 'TokenRevocation plugin',
    description: 'A logout/revoke route using the TokenRevocation plugin instead of ValidateToken.',
    body: `POST /v2/login/revoke
Required Scope: -
Plugin: TokenRevocation`,
  },
  {
    id: 'multiple-plugins',
    title: 'Multiple plugins in order',
    description: 'A route that chains ValidateTokenIfApiAuth, CheckUserStatus and GenerateAndStoreToken.',
    body: `POST /v1/login/resetpin/verifyuser

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
Generate Scope: resetpin_verifyuser`,
  },
  {
    id: 'generate-and-store-token',
    title: 'GenerateAndStoreToken',
    description: 'A route that issues a new token after a successful step.',
    body: `POST /v1/login/resetpin/confirm

Plugin: GenerateAndStoreToken
Status Codes: 1000
Generate Scope: resetpin_verifyuser`,
  },
  {
    id: 'generate-and-store-token-by-session',
    title: 'GenerateAndStoreTokenBySession',
    description: 'A route that validates a token and then issues a session-bound token.',
    body: `POST /v1/fasteasy-login

Plugin: ValidateToken
Required Scope: prelogin, oob

Plugin: GenerateAndStoreTokenBySession
Status Code: 1000
Generate Scope: oob`,
  },
  {
    id: 'addresses-mailing-address',
    title: 'Addresses / mailingAddress set',
    description: 'Four related routes under /v1/addresses/mailingAddress.',
    body: `[GW-EXT] | Add scope for Addresses Mailing Address routes - Aug 2026

/v1/addresses/mailingAddress/confirmation/inquiry/ext
Method: POST
Required Scope: oob

/v1/addresses/mailingAddress/goodtoknow
Methods: GET, POST, PUT, DELETE
Required Scope: oob

/v1/addresses/mailingAddress/landing
Methods: GET, POST, PUT, DELETE
Required Scope: oob

/v1/addresses/mailingAddress/landing/ext
Method: POST
Required Scope: oob`,
  },
  {
    id: 'lending-set',
    title: 'Lending set',
    description: 'Two lending routes added in the same ticket.',
    body: `[GW-EXT] | Add scope for POST /v1/lending/referral/verification/ext - Jun 2026

Required Scope: oob

[GW-EXT] | Add scope for POST /v1/lending/introductions/inquiry/ext - Jun 2026

Required Scope: oob`,
  },
]
