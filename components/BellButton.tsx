'use client'

import { Bell } from 'lucide-react'

export default function BellButton() {
  return (
    <button
      style={{
        width: 40, height: 40, borderRadius: 14,
        background: '#fff',
        border: '1px solid rgba(15,23,42,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flexShrink: 0,
      }}
    >
      <Bell size={20} strokeWidth={2} color="#475569" />
    </button>
  )
}
