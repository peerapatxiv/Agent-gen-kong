import { FileText, Sparkles, Trash2 } from 'lucide-react'
import { EXAMPLE_TICKETS } from '@/examples/tickets'
import { Button } from './ui/Button'

interface TicketInputProps {
  value: string
  onChange: (value: string) => void
  onGenerate: () => void
  onClear: () => void
  onLoadExample: (body: string) => void
}

export function TicketInput({ value, onChange, onGenerate, onClear, onLoadExample }: TicketInputProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="ticket-input" className="text-sm font-semibold text-[var(--color-text)]">
          Jira Ticket / Description
        </label>
        <span className="text-xs text-[var(--color-text-faint)]">{value.length.toLocaleString()} chars</span>
      </div>

      <textarea
        id="ticket-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste your Jira Add Scope / Add Route ticket here..."
        spellCheck={false}
        className="h-72 w-full resize-y rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 font-mono text-[13px] leading-relaxed text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/25"
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
  )
}
