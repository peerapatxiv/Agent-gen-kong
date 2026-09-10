import { useState } from 'react'
import { ChevronDown, ChevronRight, ListChecks, ShieldOff } from 'lucide-react'
import type { RouteDefinition } from '@/types/route'
import { RouteEditor } from './RouteEditor'
import { Badge } from './ui/Badge'

interface RoutePreviewProps {
  routes: RouteDefinition[]
  excludedRoutes: RouteDefinition[]
  onUpdate: (id: string, patch: Partial<RouteDefinition>) => void
  onDelete: (id: string) => void
}

export function RoutePreview({ routes, excludedRoutes, onUpdate, onDelete }: RoutePreviewProps) {
  const [excludedOpen, setExcludedOpen] = useState(false)

  const scopeCount = new Set(routes.flatMap((r) => r.scopes)).size
  const pluginCount = new Set(routes.flatMap((r) => r.plugins.map((p) => p.name))).size

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
          <ListChecks size={16} />
          Detected Routes
        </h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="accent">{routes.length} route{routes.length === 1 ? '' : 's'}</Badge>
          <Badge variant="neutral">{scopeCount} scope{scopeCount === 1 ? '' : 's'}</Badge>
          <Badge variant="neutral">{pluginCount} plugin{pluginCount === 1 ? '' : 's'}</Badge>
          <Badge variant="neutral">{excludedRoutes.length} excluded</Badge>
        </div>
      </div>

      {routes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-faint)]">
          No external routes detected yet. Paste a ticket and click Generate YAML.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {routes.map((route) => (
            <RouteEditor key={route.id} route={route} onUpdate={onUpdate} onDelete={onDelete} />
          ))}
        </div>
      )}

      <div className="rounded-xl border border-[var(--color-border)]">
        <button
          type="button"
          onClick={() => setExcludedOpen((o) => !o)}
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-[var(--color-text)]"
        >
          {excludedOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          <ShieldOff size={15} className="text-[var(--color-text-faint)]" />
          Excluded Routes
          <span className="text-[var(--color-text-faint)]">
            — {excludedRoutes.length} internal/excluded API row{excludedRoutes.length === 1 ? '' : 's'} skipped
          </span>
        </button>
        {excludedOpen && (
          <div className="border-t border-[var(--color-border)] p-3">
            {excludedRoutes.length === 0 ? (
              <p className="px-1 py-2 text-sm text-[var(--color-text-faint)]">Nothing was excluded from this ticket.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {excludedRoutes.map((route) => (
                  <div key={route.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-code-bg)] px-3 py-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="neutral">excluded</Badge>
                      <code className="font-mono text-[var(--color-text)]">{route.methods.join(', ') || '?'} {route.path}</code>
                      {route.exclusionReason && <span className="text-[var(--color-text-faint)]">reason: {route.exclusionReason}</span>}
                    </div>
                    {route.sourceText && (
                      <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px] text-[var(--color-text-faint)]">{route.sourceText}</pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
