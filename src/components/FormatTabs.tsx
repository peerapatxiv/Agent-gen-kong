import clsx from 'clsx'
import type { CSSProperties, ReactNode } from 'react'

export type FormatTabId = 'formatA' | 'formatB'

interface Tab {
  id: FormatTabId
  label: string
  sublabel: string
  badge?: ReactNode
  /** CSS variable name (without var()) used to tint this tab and the output panel when active. */
  accent: string
}

interface FormatTabsProps {
  tabs: Tab[]
  active: FormatTabId
  onChange: (id: FormatTabId) => void
}

export function FormatTabs({ tabs, active, onChange }: FormatTabsProps) {
  return (
    <div role="tablist" className="flex items-center gap-1 rounded-lg bg-[var(--color-code-bg)] p-1">
      {tabs.map((tab) => {
        const isActive = active === tab.id
        const style = { '--tab-accent': `var(${tab.accent})` } as CSSProperties
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            style={style}
            className={clsx(
              'flex flex-1 flex-col items-start gap-0.5 rounded-md border px-3 py-1.5 text-left transition-colors',
              isActive
                ? 'border-[var(--tab-accent)]/40 bg-[var(--color-surface)] shadow-[var(--shadow-sm)]'
                : 'border-transparent hover:bg-[var(--color-surface)]/60',
            )}
          >
            <span className="flex flex-nowrap items-center gap-2 whitespace-nowrap text-sm font-semibold" style={isActive ? { color: 'var(--tab-accent)' } : { color: 'var(--color-text)' }}>
              <span className={clsx('h-2 w-2 shrink-0 rounded-full', isActive ? 'opacity-100' : 'opacity-40')} style={{ background: 'var(--tab-accent)' }} />
              {tab.label}
              {tab.badge}
            </span>
            <span className="text-[11px] text-[var(--color-text-faint)]">{tab.sublabel}</span>
          </button>
        )
      })}
    </div>
  )
}
