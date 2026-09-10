import { useMemo, useState } from 'react'
import { Moon, RouteIcon, Sun } from 'lucide-react'
import clsx from 'clsx'
import { parseTicket } from '@/parser/ticketParser'
import { generateFormatA } from '@/generators/formatA'
import { generateFormatB } from '@/generators/formatB'
import type { ParseResult, RouteDefinition } from '@/types/route'
import { useTheme } from '@/hooks/useTheme'
import { ToastProvider, useToast } from '@/hooks/useToast'
import { TicketInput } from '@/components/TicketInput'
import { RoutePreview } from '@/components/RoutePreview'
import { YamlOutput } from '@/components/YamlOutput'
import { ValidationPanel } from '@/components/ValidationPanel'
import { Button } from '@/components/ui/Button'

const EMPTY_RESULT: ParseResult = { routes: [], excludedRoutes: [], issues: [] }

type FormatSelection = 'both' | 'A' | 'B'

function AppShell() {
  const [theme, toggleTheme] = useTheme()
  const [ticketText, setTicketText] = useState('')
  const [result, setResult] = useState<ParseResult>(EMPTY_RESULT)
  const [formatSelection, setFormatSelection] = useState<FormatSelection>('both')
  const toast = useToast()

  const runParse = (text: string) => {
    setResult(parseTicket(text))
  }

  const handleGenerate = () => {
    if (!ticketText.trim()) {
      toast.show('Paste a ticket description first', 'error')
      return
    }
    runParse(ticketText)
    toast.show('YAML generated', 'success')
  }

  const handleClear = () => {
    setTicketText('')
    setResult(EMPTY_RESULT)
  }

  const handleLoadExample = (body: string) => {
    setTicketText(body)
    runParse(body)
  }

  const updateRoute = (id: string, patch: Partial<RouteDefinition>) => {
    setResult((prev) => ({
      ...prev,
      routes: prev.routes.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }))
  }

  const deleteRoute = (id: string) => {
    setResult((prev) => ({ ...prev, routes: prev.routes.filter((r) => r.id !== id) }))
  }

  const formatA = useMemo(() => generateFormatA(result.routes), [result.routes])
  const formatB = useMemo(() => generateFormatB(result.routes), [result.routes])

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border)] pb-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <RouteIcon size={18} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[var(--color-text)] sm:text-xl">GW Ticket → Route YAML Generator</h1>
            <p className="mt-0.5 max-w-2xl text-sm text-[var(--color-text-muted)]">
              Convert Jira Add Scope / Add Route tickets into App-config and Kong Deck route YAML.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      <main className="grid flex-1 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <TicketInput value={ticketText} onChange={setTicketText} onGenerate={handleGenerate} onClear={handleClear} onLoadExample={handleLoadExample} />
          <RoutePreview routes={result.routes} excludedRoutes={result.excludedRoutes} onUpdate={updateRoute} onDelete={deleteRoute} />
        </div>

        <div className="flex flex-col gap-6 xl:sticky xl:top-6 xl:self-start">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Generated YAML</h2>
            <FormatSelector value={formatSelection} onChange={setFormatSelection} />
          </div>
          <YamlOutput routes={result.routes} formatA={formatA} formatB={formatB} visibleFormats={formatSelection} />
          <ValidationPanel routes={result.routes} excludedRoutes={result.excludedRoutes} issues={result.issues} formatA={formatA} formatB={formatB} />
        </div>
      </main>

      <footer className="mt-10 border-t border-[var(--color-border)] pt-4 text-center text-xs text-[var(--color-text-faint)]">
        Runs entirely in your browser. Ticket text is never sent anywhere.
      </footer>
    </div>
  )
}

function FormatSelector({ value, onChange }: { value: FormatSelection; onChange: (v: FormatSelection) => void }) {
  const options: { id: FormatSelection; label: string }[] = [
    { id: 'both', label: 'Both' },
    { id: 'A', label: 'Format A' },
    { id: 'B', label: 'Format B' },
  ]
  return (
    <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] p-0.5">
      {options.map((opt) => (
        <Button key={opt.id} size="sm" variant={value === opt.id ? 'primary' : 'ghost'} className={clsx('h-6 px-2 text-[11px]')} onClick={() => onChange(opt.id)}>
          {opt.label}
        </Button>
      ))}
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  )
}
