import { useState } from 'react'
import { Check, Copy, ExternalLink, Loader2, Sparkles } from 'lucide-react'
import { buildJiraRestUrl, fetchJiraIssueJson, jiraIssueJsonToTicketText, parseJiraIssueUrl, type JiraCredentials } from '@/parser/jiraImport'
import { useToast } from '@/hooks/useToast'
import { Button } from './ui/Button'

const CREDENTIALS_KEY = 'jira-import-credentials'
const inputClass =
  'h-8 min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-xs text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/25'

function loadStoredCredentials(): JiraCredentials {
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY)
    if (!raw) return { email: '', apiToken: '' }
    const parsed = JSON.parse(raw) as Partial<JiraCredentials>
    return { email: typeof parsed.email === 'string' ? parsed.email : '', apiToken: typeof parsed.apiToken === 'string' ? parsed.apiToken : '' }
  } catch {
    return { email: '', apiToken: '' }
  }
}

interface JiraUrlImportProps {
  onImport: (ticketText: string) => void
}

/**
 * Paste a Jira issue URL and try to fetch it directly (Basic Auth with a Jira API
 * token). Jira Cloud often blocks cross-origin fetches via CORS regardless of valid
 * credentials, so a failure falls back to opening the REST response in a new tab
 * (your logged-in Jira session) for a manual copy/paste.
 */
export function JiraUrlImport({ onImport }: JiraUrlImportProps) {
  const [url, setUrl] = useState('')
  const [credentials, setCredentials] = useState<JiraCredentials>(loadStoredCredentials)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [jsonPaste, setJsonPaste] = useState('')
  const toast = useToast()

  const updateCredentials = (patch: Partial<JiraCredentials>) => {
    setCredentials((prev) => {
      const next = { ...prev, ...patch }
      localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(next))
      return next
    })
  }

  const loadFromJson = (jsonText: string) => {
    const { ticketText, issueKey } = jiraIssueJsonToTicketText(jsonText)
    onImport(ticketText)
    toast.show(issueKey ? `Loaded ${issueKey} from Jira` : 'Loaded ticket from Jira', 'success')
    setJsonPaste('')
  }

  const resolveRef = () => {
    const ref = parseJiraIssueUrl(url)
    if (!ref) {
      toast.show('Paste a Jira issue URL, e.g. https://your-site.atlassian.net/browse/TGP-2214', 'error')
      return null
    }
    return ref
  }

  const handleOpenLink = () => {
    const ref = resolveRef()
    if (!ref) return
    window.open(buildJiraRestUrl(ref.origin, ref.issueKey), '_blank', 'noopener,noreferrer')
  }

  const handleCopyLink = async () => {
    const ref = resolveRef()
    if (!ref) return
    try {
      await navigator.clipboard.writeText(buildJiraRestUrl(ref.origin, ref.issueKey))
      setCopied(true)
      toast.show('Link copied', 'success')
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.show('Could not copy — copy the link manually', 'error')
    }
  }

  const handleFetch = async () => {
    const ref = resolveRef()
    if (!ref) return

    if (!credentials.email.trim() || !credentials.apiToken.trim()) {
      toast.show('Add your Jira email and API token above, or use Open + paste the JSON manually below.', 'error')
      handleOpenLink()
      return
    }

    setLoading(true)
    try {
      const json = await fetchJiraIssueJson(ref.origin, ref.issueKey, credentials)
      loadFromJson(json)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Direct fetch failed.', 'error')
      handleOpenLink()
    } finally {
      setLoading(false)
    }
  }

  const handleLoadPaste = () => {
    try {
      loadFromJson(jsonPaste)
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not parse that JSON', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-[var(--color-border)] p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)]">
        <Sparkles size={13} />
        Import from Jira URL
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="email"
          value={credentials.email}
          onChange={(e) => updateCredentials({ email: e.target.value })}
          placeholder="Jira email"
          autoComplete="username"
          className={`${inputClass} w-40 flex-1`}
        />
        <input
          type="password"
          value={credentials.apiToken}
          onChange={(e) => updateCredentials({ apiToken: e.target.value })}
          placeholder="Jira API token"
          autoComplete="current-password"
          title="Use a classic (unscoped) API token, or a scoped token with the read:jira-work scope enabled for Jira"
          className={`${inputClass} w-40 flex-1`}
        />
      </div>

      <p className="text-[11px] text-[var(--color-text-faint)]">
        Create a{' '}
        <a
          href="https://id.atlassian.com/manage-profile/security/api-tokens"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-[var(--color-text-muted)]"
        >
          classic (unscoped) API token
        </a>{' '}
        — scoped tokens need the <code>read:jira-work</code> scope enabled for Jira or the fetch below will fail with a permission/scope
        error.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-site.atlassian.net"
          className={`${inputClass} min-w-0 flex-1`}
        />
        <Button variant="outline" size="sm" onClick={handleOpenLink} title="Open the issue JSON in a new tab (uses your logged-in Jira session)">
          <ExternalLink size={13} />
          Open
        </Button>
        <Button variant="outline" size="sm" onClick={handleCopyLink} title="Copy the issue JSON link">
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy link'}
        </Button>
        <Button variant="primary" size="sm" onClick={handleFetch} disabled={loading}>
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {loading ? 'Fetching…' : 'Fetch ticket'}
        </Button>
      </div>

      <p className="text-[11px] text-[var(--color-text-faint)]">
        Email/token are stored only in this browser and sent directly to your Jira site — never anywhere else. Don't want to enter a
        token? Click Open (or Copy the link and paste it into your browser) to view the ticket JSON with your normal Jira login, then
        copy the response body and paste it below.
      </p>

      <div className="flex flex-col gap-2">
        <textarea
          value={jsonPaste}
          onChange={(e) => setJsonPaste(e.target.value)}
          placeholder="Paste the JSON response here..."
          spellCheck={false}
          className="h-20 w-full resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 font-mono text-[11px] leading-relaxed text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/25"
        />
        <Button variant="secondary" size="sm" onClick={handleLoadPaste} disabled={!jsonPaste.trim()} className="self-start">
          Load ticket
        </Button>
      </div>
    </div>
  )
}
