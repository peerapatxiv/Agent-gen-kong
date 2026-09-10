import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Check, AlertTriangle, Info } from 'lucide-react'

interface ToastItem {
  id: number
  message: string
  variant: 'success' | 'error' | 'info'
}

interface ToastContextValue {
  show: (message: string, variant?: ToastItem['variant']) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const show = useCallback((message: string, variant: ToastItem['variant'] = 'success') => {
    counter.current += 1
    const id = counter.current
    setToasts((prev) => [...prev, { id, message, variant }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 2600)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3.5 py-2.5 text-sm text-[var(--color-text)] shadow-[var(--shadow-md)] animate-[toast-in_0.18s_ease-out]"
          >
            {t.variant === 'success' && <Check size={16} className="text-[var(--color-success)]" />}
            {t.variant === 'error' && <AlertTriangle size={16} className="text-[var(--color-danger)]" />}
            {t.variant === 'info' && <Info size={16} className="text-[var(--color-accent)]" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
