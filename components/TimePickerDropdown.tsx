'use client'

import { useState, useRef, useEffect } from 'react'

// All slots 12:00 AM – 11:45 PM, every 15 min
const ALL_SLOTS: { value: string; label: string }[] = []
for (let h = 0; h < 24; h++) {
  for (const m of [0, 15, 30, 45]) {
    const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    const ampm  = h >= 12 ? 'PM' : 'AM'
    const h12   = h % 12 || 12
    const label = `${h12}:${String(m).padStart(2, '0')} ${ampm}`
    ALL_SLOTS.push({ value, label })
  }
}

const NONE_SLOT = { value: '', label: '—' }

function todayStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// Next 15-min boundary from now (exclusive)
function nextSlotMins(): number {
  const now = new Date()
  const total = now.getHours() * 60 + now.getMinutes()
  return Math.ceil((total + 1) / 15) * 15
}

interface Props {
  value: string        // "HH:MM" or ""
  date: string         // "YYYY-MM-DD" or ""
  onChange: (v: string) => void
  style?: React.CSSProperties
  allowNone?: boolean  // show "—" as first option; value="" means no selection
  minAfter?: string    // "HH:MM" — only show slots strictly after this time
  noTodayFilter?: boolean  // skip filtering by current time-of-day (for end-time pickers)
}

export default function TimePickerDropdown({ value, date, onChange, style, allowNone, minAfter, noTodayFilter }: Props) {
  const [open, setOpen] = useState(false)
  const ref     = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const isToday = !noTodayFilter && date === todayStr()
  const baseSlots = isToday
    ? ALL_SLOTS.filter(s => {
        const [h, m] = s.value.split(':').map(Number)
        return h * 60 + m >= nextSlotMins()
      })
    : ALL_SLOTS

  const filteredSlots = minAfter
    ? baseSlots.filter(s => s.value > minAfter)
    : baseSlots

  const visibleSlots = allowNone ? [NONE_SLOT, ...filteredSlots] : filteredSlots

  // Snap to first available slot (only for non-allowNone pickers; allowNone parent handles reset)
  useEffect(() => {
    if (allowNone) return
    if (filteredSlots.length > 0 && !filteredSlots.some(s => s.value === value)) {
      onChange(filteredSlots[0].value)
    }
  }, [date])

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
  useEffect(() => {
    if (!open) return
    const target = value || ''
    const el = listRef.current?.querySelector(`[data-value="${target}"]`) as HTMLElement | null
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [open, value])

  const displayLabel = (allowNone && value === '') ? '—' : ALL_SLOTS.find(s => s.value === value)?.label ?? ''

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      {/* Trigger */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', border: '1px solid #E8E8E8', borderRadius: 12,
          padding: '12px 36px 12px 14px', fontSize: 15, background: '#fff',
          boxSizing: 'border-box', fontFamily: 'inherit', cursor: 'pointer',
          color: (displayLabel && displayLabel !== '—') ? '#0A1628' : '#9CA3AF',
          position: 'relative', userSelect: 'none',
        }}
      >
        {displayLabel || 'Select time'}
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
          {visibleSlots.length === 0 && (
            <div style={{ padding: '10px 14px', fontSize: 14, color: '#9CA3AF', fontFamily: 'inherit' }}>
              No available times
            </div>
          )}
          {visibleSlots.map(slot => {
            const selected = slot.value === value
            return (
              <div
                key={slot.value === '' ? '__none__' : slot.value}
                data-value={slot.value}
                onClick={() => { onChange(slot.value); setOpen(false) }}
                style={{
                  padding: '10px 14px', fontSize: 14, fontFamily: 'inherit',
                  cursor: 'pointer',
                  color: selected ? '#2563EB' : slot.value === '' ? '#9CA3AF' : '#0A1628',
                  fontWeight: selected ? 700 : 400,
                  background: selected ? '#EFF6FF' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = selected ? '#EFF6FF' : '#F8FAFC' }}
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
