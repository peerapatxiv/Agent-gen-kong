import type { ReactNode } from 'react'
import clsx from 'clsx'

type Variant = 'neutral' | 'success' | 'danger' | 'warning' | 'accent'

const variantClasses: Record<Variant, string> = {
  neutral: 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] border-[var(--color-border)]',
  success: 'bg-[var(--color-success-soft)] text-[var(--color-success)] border-transparent',
  danger: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)] border-transparent',
  warning: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-transparent',
  accent: 'bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-transparent',
}

export function Badge({ children, variant = 'neutral', className }: { children: ReactNode; variant?: Variant; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium leading-none',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
