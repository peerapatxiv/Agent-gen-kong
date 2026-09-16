import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildJiraRestUrl, fetchJiraIssueJson, htmlToTicketText, jiraIssueJsonToTicketText, parseJiraIssueUrl } from './jiraImport'
import { parseTicket } from './ticketParser'

describe('parseJiraIssueUrl', () => {
  it('extracts origin and issue key from a plain browse URL', () => {
    expect(parseJiraIssueUrl('https://scbtechx.atlassian.net/browse/TGP-2214')).toEqual({
      origin: 'https://scbtechx.atlassian.net',
      issueKey: 'TGP-2214',
    })
  })

  it('extracts issue key when the URL has a trailing slash or query string', () => {
    expect(parseJiraIssueUrl('https://scbtechx.atlassian.net/browse/TGP-2214/'))
      .toEqual({ origin: 'https://scbtechx.atlassian.net', issueKey: 'TGP-2214' })
    expect(parseJiraIssueUrl('https://scbtechx.atlassian.net/browse/TGP-2214?jql=foo'))
      .toEqual({ origin: 'https://scbtechx.atlassian.net', issueKey: 'TGP-2214' })
  })

  it('uppercases a lowercase issue key', () => {
    expect(parseJiraIssueUrl('https://scbtechx.atlassian.net/browse/tgp-2214')).toEqual({
      origin: 'https://scbtechx.atlassian.net',
      issueKey: 'TGP-2214',
    })
  })

  it('returns null for non-issue URLs or plain text', () => {
    expect(parseJiraIssueUrl('https://scbtechx.atlassian.net/jira/software/projects/TGP/boards/1')).toBeNull()
    expect(parseJiraIssueUrl('POST /v1/login/inquiry')).toBeNull()
    expect(parseJiraIssueUrl('')).toBeNull()
  })
})

describe('buildJiraRestUrl', () => {
  it('builds the expand=renderedFields REST endpoint', () => {
    expect(buildJiraRestUrl('https://scbtechx.atlassian.net', 'TGP-2214')).toBe(
      'https://scbtechx.atlassian.net/rest/api/latest/issue/TGP-2214?expand=renderedFields',
    )
  })
})

describe('htmlToTicketText', () => {
  it('converts a table into pipe-delimited rows the route parser recognizes', () => {
    const html = `
      <table>
        <tbody>
          <tr><th>API</th><th>Method</th><th>Required Scope</th></tr>
          <tr><td>/v2/profiles/personalized-settings/ext</td><td>PUT</td><td>oob, prelogin</td></tr>
        </tbody>
      </table>
    `
    expect(htmlToTicketText(html)).toBe(
      '| API | Method | Required Scope |\n| /v2/profiles/personalized-settings/ext | PUT | oob, prelogin |',
    )
  })

  it('flattens bold field labels and paragraphs into "Field: value" lines', () => {
    const html = '<p>POST /v1/login/inquiry</p><p><strong>Required Scope:</strong> oob</p>'
    expect(htmlToTicketText(html)).toBe('POST /v1/login/inquiry\nRequired Scope: oob')
  })

  it('treats <br> as a line break within a block', () => {
    const html = '<p>POST /v1/login/inquiry<br>Required Scope: oob</p>'
    expect(htmlToTicketText(html)).toBe('POST /v1/login/inquiry\nRequired Scope: oob')
  })

  it('decodes HTML entities', () => {
    expect(htmlToTicketText('<p>Required Scope: a &amp; b</p>')).toBe('Required Scope: a & b')
  })
})

describe('jiraIssueJsonToTicketText', () => {
  it('combines summary and rendered description into ticket text the parser can consume', () => {
    const json = JSON.stringify({
      key: 'TGP-2214',
      fields: { summary: '[External GW] | Add Scope to EXT-GW' },
      renderedFields: {
        description: '<p>PUT /v2/profiles/personalized-settings/ext</p><p><strong>Required Scope:</strong> oob, prelogin</p>',
      },
    })

    const result = jiraIssueJsonToTicketText(json)
    expect(result.issueKey).toBe('TGP-2214')
    expect(result.ticketText).toBe(
      '[External GW] | Add Scope to EXT-GW\n\nPUT /v2/profiles/personalized-settings/ext\nRequired Scope: oob, prelogin',
    )

    const parsed = parseTicket(result.ticketText)
    expect(parsed.routes).toHaveLength(1)
    expect(parsed.routes[0].path).toBe('/v2/profiles/personalized-settings/ext')
  })

  it('throws a friendly error on invalid JSON', () => {
    expect(() => jiraIssueJsonToTicketText('not json')).toThrow(/valid JSON/i)
  })

  it('throws a friendly error when renderedFields.description is missing', () => {
    const json = JSON.stringify({ key: 'TGP-2214', fields: { summary: 'x' }, renderedFields: {} })
    expect(() => jiraIssueJsonToTicketText(json)).toThrow(/expand=renderedFields/i)
  })
})

describe('fetchJiraIssueJson', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends a Basic Auth header built from the credentials and returns the response body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('{"key":"TGP-2214"}') })
    vi.stubGlobal('fetch', fetchMock)

    const body = await fetchJiraIssueJson('https://scbtechx.atlassian.net', 'TGP-2214', { email: 'a@b.com', apiToken: 'tok' })

    expect(body).toBe('{"key":"TGP-2214"}')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://scbtechx.atlassian.net/rest/api/latest/issue/TGP-2214?expand=renderedFields',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Basic ${btoa('a@b.com:tok')}`, Accept: 'application/json' }),
      }),
    )
  })

  it('throws a CORS/network-flavored error when fetch itself rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )

    await expect(fetchJiraIssueJson('https://scbtechx.atlassian.net', 'TGP-2214', { email: 'a@b.com', apiToken: 'tok' })).rejects.toThrow(
      /cors/i,
    )
  })

  it('surfaces Jira error messages on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve(JSON.stringify({ errorMessages: ['You are not authenticated.'] })),
      }),
    )

    await expect(fetchJiraIssueJson('https://scbtechx.atlassian.net', 'TGP-2214', { email: 'a@b.com', apiToken: 'bad' })).rejects.toThrow(
      /not authenticated/i,
    )
  })
})
