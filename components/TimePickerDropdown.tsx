'use client'

import { useState, useRef, useEffect } from 'react'

const TIME_FRAMES = [
  '8:00 AM – 10:00 AM',
  '10:00 AM – 12:00 PM',
  '12:00 PM – 2:00 PM',
  '2:00 PM – 4:00 PM',
  '4:00 PM – 6:00 PM',
  '6:00 PM – 8:00 PM',
]

// Start hour for each slot (for today-filtering)
const SLOT_START_HOURS: Record<string, number> = {
  '8:00 AM – 10:00 AM':  8,
  '10:00 AM – 12:00 PM': 10,
  '12:00 PM – 2:00 PM':  12,
  '2:00 PM – 4:00 PM':   14,
  '4:00 PM – 6:00 PM':   16,
  '6:00 PM – 8:00 PM':   18,
}

function todayStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

interface Props {
  value: string
  date: string
  onChange: (v: string) => void
  style?: React.CSSProperties
}

export default function TimePickerDropdown({ value, date, onChange, style }: Props) {
  const [open, setOpen] = useState(false)
  const ref     = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const isToday = date === todayStr()
  const nowHour = new Date().getHours()
  const slots = isToday
    ? TIME_FRAMES.filter(s => SLOT_START_HOURS[s] > nowHour)
    : TIME_FRAMES

  // If current value is not in the filtered slot list, snap to the first available slot
  useEffect(() => {
    if (slots.length > 0 && !slots.includes(value)) {
      onChange(slots[0])
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

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      {/* Trigger */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', border: '1px solid #E8E8E8', borderRadius: 12,
          padding: '12px 36px 12px 14px', fontSize: 15, background: '#fff',
          boxSizing: 'border-box', fontFamily: 'inherit', cursor: 'pointer',
          color: value ? '#0A1628' : '#9CA3AF',
          position: 'relative', userSelect: 'none',
        }}
      >
        {value || 'Select time frame'}
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
          {slots.length === 0 && (
            <div style={{ padding: '10px 14px', fontSize: 14, color: '#9CA3AF', fontFamily: 'inherit' }}>
              No available times today
            </div>
          )}
          {slots.map(slot => {
            const selected = slot === value
            return (
              <div
                key={slot}
                onClick={() => { onChange(slot); setOpen(false) }}
                style={{
                  padding: '10px 14px', fontSize: 14, fontFamily: 'inherit',
                  cursor: 'pointer',
                  color: selected ? '#2563EB' : '#0A1628',
                  fontWeight: selected ? 700 : 400,
                  background: selected ? '#EFF6FF' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = selected ? '#EFF6FF' : '#F8FAFC' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = selected ? '#EFF6FF' : 'transparent' }}
              >
                {slot}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
