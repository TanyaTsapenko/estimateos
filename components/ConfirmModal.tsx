'use client'

export type ConfirmIcon = 'trash' | 'user-minus' | 'alert'

interface ConfirmModalProps {
  open: boolean
  icon?: ConfirmIcon
  title: string
  body: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

const TrashIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C0341A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13" />
    <path d="M10 11v6M14 11v6" />
  </svg>
)

const UserMinusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C0341A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 11c1.657 0 3-1.343 3-3s-1.343-3-3-3" />
    <path d="M20 21c0-3.314-2-6-6-6" />
    <circle cx="9" cy="7" r="4" />
    <path d="M3 21c0-3.314 2.686-6 6-6s6 2.686 6 6" />
    <line x1="18" y1="17" x2="24" y2="17" />
  </svg>
)

const AlertIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C0341A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

export default function ConfirmModal({
  open,
  icon = 'trash',
  title,
  body,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null

  const IconComponent = icon === 'trash' ? TrashIcon : icon === 'user-minus' ? UserMinusIcon : AlertIcon

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 16px',
      }}
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        style={{
          background: '#fff', borderRadius: 14, padding: 28,
          width: 340, maxWidth: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: '#FEE2E2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IconComponent />
          </div>
        </div>

        <div style={{
          fontSize: 17, fontWeight: 500, color: '#0B1220',
          textAlign: 'center', marginBottom: 8,
          fontFamily: '-apple-system, "SF Pro Text", system-ui, sans-serif',
        }}>
          <span id="confirm-modal-title">{title}</span>
        </div>

        <div style={{
          fontSize: 14, color: '#64748B', textAlign: 'center',
          lineHeight: 1.55, marginBottom: 24,
          fontFamily: '-apple-system, "SF Pro Text", system-ui, sans-serif',
        }}>
          {body}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, height: 44, borderRadius: 10,
              background: '#fff', border: '1px solid #e5e7eb',
              fontSize: 15, fontWeight: 600, cursor: 'pointer', color: '#374151',
              fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, height: 44, borderRadius: 10,
              background: '#C0341A', border: 'none',
              fontSize: 15, fontWeight: 600, cursor: 'pointer', color: '#fff',
              fontFamily: 'inherit',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
