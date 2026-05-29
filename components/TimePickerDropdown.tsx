'use client'

import { useState, useRef, useEffect } from 'react'

// Slots from 6:00 AM to 10:00 PM, every 30 min
const SLOTS: { value: string; label: string }[] = []
for (let h = 6; h <= 22; h++) {
  for (const m of [0, 30]) {
    if (h === 22 && m === 30) break
    const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12  = h % 12 || 12
    const label = `${h12}:${String(m).padStart(2, '0')} ${ampm}`
    SLOTS.push({ value, label })
  }
}

interface Props {
  value: string        // "HH:MM" or ""
  date: string         // "YYYY-MM-DD" or ""
  onChange: (v: string) => void
  style?: React.CSSProperties
}

export default function TimePickerDropdown({ value, date, onChange, style }: Props) {
  const [open, setOpen] = useState(false)
  const ref  = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  // Scroll selected slot into view
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open || !value) return
    const el = listRef.current?.querySelector(`[data-value="${value}"]`) as HTMLElement | null
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [open, value])

  const now      = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const isToday  = date === todayStr
  const nowMins  = now.getHours() * 60 + now.getMinutes()

  function isPast(slotValue: string): boolean {
    if (!isToday) return false
    const [h, m] = slotValue.split(':').map(Number)
    return h * 60 + m <= nowMins
  }

  const displayLabel = SLOTS.find(s => s.value === value)?.label ?? ''

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      {/* Trigger */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', border: '1px solid #E8E8E8', borderRadius: 12,
          padding: '12px 36px 12px 14px', fontSize: 15, background: '#fff',
          boxSizing: 'border-box', fontFamily: 'inherit', cursor: 'pointer',
          color: displayLabel ? '#0A1628' : '#9CA3AF',
          position: 'relative', userSelect: 'none',
        }}
      >
        {displayLabel || 'Select time'}
        {/* Chevron */}
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ position: 'absolute', right: 12, top: '50%', transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`, transition: 'transform 0.15s' }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {/* Dropdown list */}
      {open && (
        <div
          ref={listRef}
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: '#fff', border: '1px solid #E8E8E8', borderRadius: 12,
            maxHeight: 240, overflowY: 'auto', zIndex: 9999,
            boxShadow: '0 8px 24px rgba(15,23,42,0.10)',
          }}
        >
          {SLOTS.map(slot => {
            const past     = isPast(slot.value)
            const selected = slot.value === value
            return (
              <div
                key={slot.value}
                data-value={slot.value}
                onClick={() => { if (past) return; onChange(slot.value); setOpen(false) }}
                style={{
                  padding: '10px 14px', fontSize: 14, fontFamily: 'inherit',
                  cursor: past ? 'default' : 'pointer',
                  color: past ? '#9CA3AF' : selected ? '#2563EB' : '#0A1628',
                  fontWeight: selected ? 700 : 400,
                  opacity: past ? 0.45 : 1,
                  background: selected ? '#EFF6FF' : 'transparent',
                  transition: 'background 0.1s',
                  pointerEvents: past ? 'none' : 'auto',
                }}
                onMouseEnter={e => { if (!past) (e.currentTarget as HTMLElement).style.background = selected ? '#EFF6FF' : '#F8FAFC' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = selected ? '#EFF6FF' : 'transparent' }}
              >
                {slot.label}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
