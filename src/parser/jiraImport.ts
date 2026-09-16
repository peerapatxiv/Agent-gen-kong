export interface JiraIssueRef {
  origin: string
  issueKey: string
}

export interface JiraImportResult {
  ticketText: string
  issueKey?: string
  summary?: string
}

export interface JiraCredentials {
  email: string
  apiToken: string
}

const JIRA_ISSUE_URL_RE = /^(https?:\/\/[^/]+)\/browse\/([A-Za-z][A-Za-z0-9_]*-\d+)/

/** Parse a pasted Jira issue URL (e.g. https://site.atlassian.net/browse/TGP-2214) into its site + issue key. */
export function parseJiraIssueUrl(input: string): JiraIssueRef | null {
  const match = input.trim().match(JIRA_ISSUE_URL_RE)
  if (!match) return null
  return { origin: match[1], issueKey: match[2].toUpperCase() }
}

/** Build the Jira REST endpoint for an issue, requesting HTML-rendered fields so the description can be converted back to plain text. */
export function buildJiraRestUrl(origin: string, issueKey: string): string {
  return `${origin}/rest/api/latest/issue/${issueKey}?expand=renderedFields`
}

const BLOCK_TAGS = new Set(['p', 'div', 'li', 'tr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'blockquote'])

function tableToLines(table: Element): string[] {
  const lines: string[] = []
  for (const row of Array.from(table.querySelectorAll('tr'))) {
    const cells = Array.from(row.querySelectorAll('th,td')).map((cell) => (cell.textContent ?? '').replace(/\s+/g, ' ').trim())
    if (cells.length) lines.push(`| ${cells.join(' | ')} |`)
  }
  return lines
}

function domToLines(root: Element): string[] {
  const lines: string[] = []
  let currentLine = ''

  const flush = () => {
    if (currentLine.trim()) lines.push(currentLine.trim())
    currentLine = ''
  }

  const walk = (node: ChildNode) => {
    if (node.nodeType === Node.TEXT_NODE) {
      currentLine += node.textContent ?? ''
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return

    const el = node as Element
    const tag = el.tagName.toLowerCase()

    if (tag === 'table') {
      flush()
      lines.push(...tableToLines(el))
      return
    }
    if (tag === 'br') {
      flush()
      return
    }

    const isBlock = BLOCK_TAGS.has(tag)
    if (isBlock) flush()
    el.childNodes.forEach(walk)
    if (isBlock) flush()
  }

  root.childNodes.forEach(walk)
  flush()
  return lines
}

/** Convert Jira's rendered (HTML) description into the plain-text/table shape parseTicket() already understands. */
export function htmlToTicketText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return domToLines(doc.body).join('\n')
}

/**
 * Attempt a direct authenticated fetch of a Jira issue from the browser.
 * Jira Cloud generally doesn't send CORS headers for arbitrary origins, so this call
 * commonly fails even with valid credentials — callers should fall back to the
 * open-tab-and-paste-JSON flow when it throws.
 */
export async function fetchJiraIssueJson(origin: string, issueKey: string, credentials: JiraCredentials): Promise<string> {
  const url = buildJiraRestUrl(origin, issueKey)
  const auth = btoa(`${credentials.email}:${credentials.apiToken}`)

  let response: Response
  try {
    response = await fetch(url, {
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
    })
  } catch {
    throw new Error("Direct fetch failed — likely blocked by Jira's CORS policy for this browser.")
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    let detail = ''
    try {
      const parsed = JSON.parse(body) as { errorMessages?: unknown }
      if (Array.isArray(parsed.errorMessages) && parsed.errorMessages.length > 0) {
        detail = `: ${parsed.errorMessages.join(', ')}`
      }
    } catch {
      // response body wasn't JSON — fall through with the generic message below
    }
    throw new Error(`Jira returned ${response.status}${detail || ' — check the issue key and your API token'}.`)
  }

  return response.text()
}

/** Parse a pasted Jira `issue?expand=renderedFields` JSON response into ticket text ready for parseTicket(). */
export function jiraIssueJsonToTicketText(jsonText: string): JiraImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error("That doesn't look like valid JSON. Copy the full response body from the Jira tab and paste it here.")
  }

  const issue = parsed as { key?: string; fields?: { summary?: string }; renderedFields?: { description?: string } }
  const descriptionHtml = issue.renderedFields?.description
  if (!descriptionHtml || typeof descriptionHtml !== 'string') {
    throw new Error('No renderedFields.description found in the pasted JSON — make sure the URL included ?expand=renderedFields.')
  }

  const summary = issue.fields?.summary
  const bodyText = htmlToTicketText(descriptionHtml)
  const ticketText = summary ? `${summary}\n\n${bodyText}` : bodyText

  return { ticketText, issueKey: issue.key, summary }
}
