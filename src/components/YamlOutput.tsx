import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import CodeMirror from '@uiw/react-codemirror'
import { yaml as yamlLang } from '@codemirror/lang-yaml'
import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import { CheckCircle2, Copy, Download, Maximize2, Minimize2, X, XCircle } from 'lucide-react'
import type { RouteDefinition } from '@/types/route'
import { validateFormatAYaml, validateFormatBYaml } from '@/utils/yaml'
import { copyToClipboard, downloadText, downloadZip } from '@/utils/download'
import { useToast } from '@/hooks/useToast'
import { FormatTabs, type FormatTabId } from './FormatTabs'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'

interface YamlOutputProps {
  routes: RouteDefinition[]
  formatA: string
  formatB: string
  visibleFormats: 'both' | 'A' | 'B'
}

const ACCENT_BY_TAB: Record<FormatTabId, string> = {
  formatA: '--color-format-a',
  formatB: '--color-format-b',
}

const editorTheme = EditorView.theme({
  '&': { fontSize: '13px', backgroundColor: 'transparent', height: '100%', color: 'var(--color-text)' },
  '.cm-content': { fontFamily: 'var(--font-mono)', padding: '12px 0', caretColor: 'var(--color-text)' },
  '.cm-line': { padding: '0 12px' },
  '.cm-gutters': { backgroundColor: 'transparent', border: 'none', color: 'var(--color-text-faint)' },
  '.cm-activeLine': { backgroundColor: 'transparent' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent' },
  '.cm-scroller': { overflow: 'auto' },
  '.cm-foldGutter': { color: 'var(--color-text-faint)' },
})

// Custom syntax colors tuned for readability on the neutral code background in both themes
// (the default lang-yaml palette reads poorly against a colored/dark backdrop).
const yamlHighlightStyle = HighlightStyle.define([
  { tag: [t.propertyName, t.definition(t.propertyName)], color: 'var(--yaml-key)', fontWeight: 600 },
  { tag: [t.string, t.special(t.string)], color: 'var(--yaml-string)' },
  { tag: [t.number, t.bool, t.null, t.atom], color: 'var(--yaml-number)' },
  { tag: [t.punctuation, t.meta, t.separator], color: 'var(--yaml-punct)' },
  { tag: t.comment, color: 'var(--color-text-faint)', fontStyle: 'italic' },
  { tag: t.content, color: 'var(--color-text)' },
])

export function YamlOutput({ routes, formatA, formatB, visibleFormats }: YamlOutputProps) {
  const [selectedTab, setSelectedTab] = useState<FormatTabId>('formatA')
  const [expanded, setExpanded] = useState(false)
  const toast = useToast()

  // When only one format is visible, it always wins over whatever tab the user last picked.
  const active: FormatTabId = visibleFormats === 'A' ? 'formatA' : visibleFormats === 'B' ? 'formatB' : selectedTab
  const setActive = setSelectedTab

  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [expanded])

  const validationA = useMemo(() => validateFormatAYaml(formatA, routes), [formatA, routes])
  const validationB = useMemo(() => validateFormatBYaml(formatB, routes), [formatB, routes])

  const text = active === 'formatA' ? formatA : formatB
  const validation = active === 'formatA' ? validationA : validationB
  const filename = active === 'formatA' ? 'routes-app-config.yaml' : 'routes-kong-deck.yaml'
  const accentVar = ACCENT_BY_TAB[active]

  const handleCopy = async () => {
    const ok = await copyToClipboard(text)
    toast.show(ok ? 'Copied to clipboard' : 'Copy failed', ok ? 'success' : 'error')
  }

  const handleDownload = () => {
    downloadText(filename, text)
    toast.show(`Downloaded ${filename}`, 'success')
  }

  const handleDownloadBoth = () => {
    downloadZip('gw-routes.zip', [
      { name: 'routes-app-config.yaml', content: formatA },
      { name: 'routes-kong-deck.yaml', content: formatB },
    ])
    toast.show('Downloaded gw-routes.zip', 'success')
  }

  const allTabs = [
    {
      id: 'formatA' as const,
      label: 'Format A',
      sublabel: 'App-config style',
      accent: ACCENT_BY_TAB.formatA,
      badge: <ValidityBadge valid={validationA.valid} hasContent={Boolean(formatA)} />,
    },
    {
      id: 'formatB' as const,
      label: 'Format B',
      sublabel: 'Kong Deck style',
      accent: ACCENT_BY_TAB.formatB,
      badge: <ValidityBadge valid={validationB.valid} hasContent={Boolean(formatB)} />,
    },
  ]
  const tabs = visibleFormats === 'A' ? [allTabs[0]] : visibleFormats === 'B' ? [allTabs[1]] : allTabs

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" onClick={handleCopy} disabled={!text}>
        <Copy size={13} /> Copy YAML
      </Button>
      <Button size="sm" onClick={handleDownload} disabled={!text}>
        <Download size={13} /> Download YAML
      </Button>
      {visibleFormats === 'both' && (
        <Button size="sm" variant="outline" onClick={handleDownloadBoth} disabled={!formatA && !formatB}>
          <Download size={13} /> Download Both (.zip)
        </Button>
      )}
      <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setExpanded((e) => !e)}>
        {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        {expanded ? 'Collapse' : 'Expand'}
      </Button>
    </div>
  )

  const editor = (
    <div
      className="min-h-0 flex-1 overflow-hidden rounded-xl border-2 bg-[var(--color-code-bg)] transition-colors"
      style={{ borderColor: `color-mix(in oklab, var(${accentVar}) 55%, var(--color-border))` }}
    >
      {text ? (
        <CodeMirror
          value={text}
          height="100%"
          theme={editorTheme}
          extensions={[yamlLang(), EditorView.lineWrapping, syntaxHighlighting(yamlHighlightStyle)]}
          editable={false}
          basicSetup={{ foldGutter: true }}
          className="h-full"
        />
      ) : (
        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--color-text-faint)]">
          Generated YAML will appear here once routes are detected.
        </div>
      )}
    </div>
  )

  const messages = validation.messages.length > 0 && (
    <ul className="flex flex-col gap-1">
      {validation.messages.map((m, i) => (
        <li key={i} className={`flex items-start gap-1.5 text-xs ${m.level === 'error' ? 'text-[var(--color-danger)]' : 'text-[var(--color-warning)]'}`}>
          {m.level === 'error' ? <XCircle size={13} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={13} className="mt-0.5 shrink-0" />}
          {m.message}
        </li>
      ))}
    </ul>
  )

  return (
    <div className="flex flex-col gap-3">
      {!expanded && <FormatTabs active={active} onChange={setActive} tabs={tabs} />}
      {!expanded && toolbar}
      {!expanded && <div className="flex h-96 flex-col">{editor}</div>}
      {!expanded && messages}

      {expanded &&
        createPortal(
          <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-bg)]/98 p-4 backdrop-blur-sm sm:p-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FormatTabs active={active} onChange={setActive} tabs={tabs} />
              </div>
              <Button size="sm" variant="ghost" onClick={() => setExpanded(false)}>
                <X size={14} /> Close
              </Button>
            </div>
            {toolbar}
            <div className="mt-3 flex min-h-0 flex-1 flex-col">{editor}</div>
            {messages && <div className="mt-3">{messages}</div>}
          </div>,
          document.body,
        )}
    </div>
  )
}

function ValidityBadge({ valid, hasContent }: { valid: boolean; hasContent: boolean }) {
  if (!hasContent) return null
  return valid ? (
    <Badge variant="success">
      <CheckCircle2 size={11} /> Valid YAML
    </Badge>
  ) : (
    <Badge variant="danger">
      <XCircle size={11} /> YAML Error
    </Badge>
  )
}
