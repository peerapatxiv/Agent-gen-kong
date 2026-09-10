import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import type { ParseIssue, RouteDefinition } from '@/types/route'
import { validateFormatAYaml, validateFormatBYaml } from '@/utils/yaml'

interface ValidationPanelProps {
  routes: RouteDefinition[]
  excludedRoutes: RouteDefinition[]
  issues: ParseIssue[]
  formatA: string
  formatB: string
}

export function ValidationPanel({ routes, excludedRoutes, issues, formatA, formatB }: ValidationPanelProps) {
  const validationA = validateFormatAYaml(formatA, routes)
  const validationB = validateFormatBYaml(formatB, routes)

  const summaryLines: { ok: boolean; text: string }[] = [
    { ok: true, text: `${routes.length} external route${routes.length === 1 ? '' : 's'} detected` },
    { ok: true, text: `${excludedRoutes.length} internal route${excludedRoutes.length === 1 ? '' : 's'} excluded` },
    { ok: validationA.valid, text: validationA.valid ? 'Format A YAML valid' : 'Format A YAML has errors' },
    { ok: validationB.valid, text: validationB.valid ? 'Format B YAML valid' : 'Format B YAML has errors' },
  ]

  const warnings = issues.filter((i) => i.level === 'warning')
  const infos = issues.filter((i) => i.level === 'info')

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h2 className="text-sm font-semibold text-[var(--color-text)]">Validation</h2>
      <ul className="flex flex-col gap-1.5">
        {summaryLines.map((line) => (
          <li key={line.text} className={`flex items-center gap-2 text-sm ${line.ok ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
            <CheckCircle2 size={14} className="shrink-0" />
            {line.text}
          </li>
        ))}
      </ul>

      {warnings.length > 0 && (
        <div className="border-t border-[var(--color-border)] pt-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">Warnings</p>
          <ul className="flex flex-col gap-1.5">
            {warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[var(--color-warning)]">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {infos.length > 0 && (
        <div className="border-t border-[var(--color-border)] pt-3">
          <ul className="flex flex-col gap-1.5">
            {infos.map((info, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
                <Info size={13} className="mt-0.5 shrink-0" />
                {info.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
