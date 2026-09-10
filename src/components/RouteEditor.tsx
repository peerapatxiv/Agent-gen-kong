import type { ReactNode } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import type { RouteDefinition } from '@/types/route'
import { extractDomainInfo, parseMethods } from '@/utils/normalization'
import { parseScopeList } from '@/parser/scopeParser'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'

interface RouteEditorProps {
  route: RouteDefinition
  onUpdate: (id: string, patch: Partial<RouteDefinition>) => void
  onDelete: (id: string) => void
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-faint)]">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'h-8 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2 text-[13px] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20'

export function RouteEditor({ route, onUpdate, onDelete }: RouteEditorProps) {
  const warnings: string[] = []
  if (route.methodAmbiguous) warnings.push('HTTP method could not be confidently determined.')
  if (route.versionMissing) warnings.push('No version segment (v1, v2, ...) found — verify manually.')
  if (route.hasQueryString) warnings.push('Path may contain a query string — review before using.')

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge variant={route.excluded ? 'neutral' : 'success'}>{route.excluded ? 'Internal / Excluded' : 'External'}</Badge>
        {route.version && <Badge variant="accent">{route.version}</Badge>}
        {warnings.length > 0 && <Badge variant="warning"><AlertTriangle size={11} /> {warnings.length} warning{warnings.length > 1 ? 's' : ''}</Badge>}
        <Button variant="ghost" size="icon" className="ml-auto" title="Remove this route" onClick={() => onDelete(route.id)}>
          <Trash2 size={14} />
        </Button>
      </div>

      <div className="mb-3 flex flex-col gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-code-bg)] p-3 sm:flex-row sm:items-center">
        <span className="shrink-0 whitespace-nowrap font-mono text-xs font-semibold text-[var(--color-accent)] sm:pr-1">
          {route.methods.length ? route.methods.join(', ') : '???'}
        </span>
        <input
          className="w-full min-w-0 flex-1 truncate bg-transparent font-mono text-[15px] font-medium text-[var(--color-text)] outline-none"
          defaultValue={route.path}
          spellCheck={false}
          title={route.path}
          onBlur={(e) => {
            const path = e.target.value.trim()
            const info = extractDomainInfo(path)
            onUpdate(route.id, { path, domain: info.domain, version: info.version, versionMissing: info.versionMissing })
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Method(s)">
          <input
            className={inputClass}
            defaultValue={route.methods.join(', ')}
            placeholder="GET, POST"
            onBlur={(e) => onUpdate(route.id, { methods: parseMethods(e.target.value), methodAmbiguous: parseMethods(e.target.value).length === 0 })}
          />
        </Field>
        <Field label="Domain">
          <input className={inputClass} defaultValue={route.domain} onBlur={(e) => onUpdate(route.id, { domain: e.target.value.trim().toLowerCase() })} />
        </Field>
        <Field label="Scope(s)">
          <input
            className={inputClass}
            defaultValue={route.scopes.join(', ')}
            placeholder="oob, prelogin"
            onBlur={(e) => onUpdate(route.id, { scopes: parseScopeList(e.target.value) })}
          />
        </Field>
        <Field label="Plugin(s)">
          <input
            className={inputClass}
            defaultValue={route.plugins.map((p) => p.name).join(', ')}
            placeholder="ValidateToken"
            onBlur={(e) => {
              const names = e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
              if (names.length === 0) return
              onUpdate(route.id, {
                plugins: names.map((name, i) => {
                  const existing = route.plugins.find((p) => p.name === name)
                  if (existing) return existing
                  if (i === 0 && route.scopes.length) return { name, enabled: true, config: { scopes: route.scopes } }
                  return { name, enabled: true }
                }),
              })
            }}
          />
        </Field>
        <Field label="Description (optional)">
          <input
            className={inputClass}
            defaultValue={route.description ?? ''}
            placeholder="—"
            onBlur={(e) => onUpdate(route.id, { description: e.target.value.trim() || undefined })}
          />
        </Field>
        <Field label="Tags (optional, Format A)">
          <input
            className={inputClass}
            defaultValue={route.tags?.join(', ') ?? ''}
            placeholder="auto"
            onBlur={(e) => {
              const raw = e.target.value.trim()
              const tags = raw
                ? raw
                    .split(',')
                    .map((s) => s.trim().toLowerCase())
                    .filter(Boolean)
                : undefined
              onUpdate(route.id, { tags })
            }}
          />
        </Field>
      </div>

      {warnings.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-[var(--color-border)] pt-2.5">
          {warnings.map((w) => (
            <li key={w} className="flex items-center gap-1.5 text-xs text-[var(--color-warning)]">
              <AlertTriangle size={12} /> {w}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
