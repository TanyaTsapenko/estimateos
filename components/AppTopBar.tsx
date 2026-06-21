'use client'
import { ChevronLeft } from 'lucide-react'

interface AppTopBarProps {
  // Style
  variant?: 'white' | 'dark'
  // Left back-navigation (optional)
  onBack?: () => void
  backLabel?: string
  // Title area — use eyebrow/title for simple cases, children for complex
  eyebrow?: string
  title?: string
  children?: React.ReactNode
  // Right-side actions
  right?: React.ReactNode
}

export default function AppTopBar({
  variant = 'white',
  onBack,
  backLabel = 'Back',
  eyebrow,
  title,
  children,
  right,
}: AppTopBarProps) {
  return (
    <div className={variant === 'dark' ? 'app-topbar app-topbar--dark' : 'app-topbar'}>
      {onBack && (
        <button onClick={onBack} className="app-topbar__back" aria-label="Go back">
          <ChevronLeft size={20} strokeWidth={2.2} />
          <span>{backLabel}</span>
        </button>
      )}
      <div className="app-topbar__body">
        {children != null ? children : (
          <>
            {eyebrow && <div className="app-topbar__eyebrow">{eyebrow}</div>}
            {title !== undefined && <div className="app-topbar__heading">{title}</div>}
          </>
        )}
      </div>
      {right != null && <div className="app-topbar__right">{right}</div>}
    </div>
  )
}
