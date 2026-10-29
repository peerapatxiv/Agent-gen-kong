import { useState } from 'react'
import clsx from 'clsx'
import { FileText, Link2, Sparkles, Trash2 } from 'lucide-react'
import { EXAMPLE_TICKETS } from '@/examples/tickets'
import { JiraUrlImport } from './JiraUrlImport'
import { Button } from './ui/Button'

interface TicketInputProps {
  value: string
  onChange: (value: string) => void
  onGenerate: () => void
  onClear: () => void
  onLoadExample: (body: string) => void
  onImportTicket: (text: string) => void
}

type InputMode = 'description' | 'jira'

const TABS: { id: InputMode; label: string; icon: typeof FileText }[] = [
  { id: 'description', label: 'Jira Ticket / Description', icon: FileText },
  { id: 'jira', label: 'Import from Jira URL', icon: Link2 },
]

export function TicketInput({ value, onChange, onGenerate, onClear, onLoadExample, onImportTicket }: TicketInputProps) {
  const [mode, setMode] = useState<InputMode>('description')

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex items-end justify-between gap-3 border-b border-[var(--color-border)] px-2" role="tablist" aria-label="Input mode">
        <div className="flex min-w-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => setMode(id)}
              className={clsx(
                '-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                mode === id
                  ? 'border-[var(--color-accent)] text-[var(--color-text)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
        {mode === 'description' && (
          <span className="hidden pb-2.5 pr-2 text-xs text-[var(--color-text-faint)] sm:inline">{value.length.toLocaleString()} chars</span>
        )}
      </div>

      {mode === 'jira' ? (
        <div className="p-3.5" role="tabpanel">
          <JiraUrlImport
            onImport={(text) => {
              onImportTicket(text)
              setMode('description')
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-3.5" role="tabpanel">
          <label htmlFor="ticket-input" className="sr-only">
            Jira Ticket / Description
          </label>
          <textarea
            id="ticket-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Paste your Jira Add Scope / Add Route ticket here..."
            spellCheck={false}
            className="h-72 w-full resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-code-bg)] p-3.5 font-mono text-[13px] leading-relaxed text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/25"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={onGenerate}>
              <Sparkles size={15} />
              Generate YAML
            </Button>
            <Button variant="outline" onClick={onClear}>
              <Trash2 size={15} />
              Clear
            </Button>

            <div className="relative ml-auto">
              <label className="sr-only" htmlFor="load-example">
                Load Example
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] pl-3 pr-1.5">
                <FileText size={14} className="text-[var(--color-text-faint)]" />
                <select
                  id="load-example"
                  defaultValue=""
                  onChange={(e) => {
                    const example = EXAMPLE_TICKETS.find((ex) => ex.id === e.target.value)
                    if (example) onLoadExample(example.body)
                    e.target.value = ''
                  }}
                  className="h-8 cursor-pointer appearance-none bg-transparent pr-2 text-sm text-[var(--color-text)] outline-none"
                >
                  <option value="" disabled>
                    Load Example…
                  </option>
                  {EXAMPLE_TICKETS.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
