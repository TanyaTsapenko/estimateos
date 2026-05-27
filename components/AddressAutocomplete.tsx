'use client'
import { useState, useRef, useEffect } from 'react'

interface Prediction {
  place_id: string
  structured_formatting: { main_text: string; secondary_text: string }
}

export interface AddressResult {
  street: string
  city: string
  province: string
  postalCode: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  onSelect: (result: AddressResult) => void
  placeholder?: string
  error?: boolean
  onBlur?: () => void
}

export default function AddressAutocomplete({ value, onChange, onSelect, placeholder, error, onBlur }: Props) {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function fetchPredictions(input: string) {
    if (input.length < 3) { setPredictions([]); setOpen(false); return }
    try {
      const res = await fetch(`/api/places?type=autocomplete&input=${encodeURIComponent(input)}`)
      const data = await res.json()
      const list: Prediction[] = data.predictions || []
      setPredictions(list)
      setOpen(list.length > 0)
    } catch {
      setPredictions([])
    }
  }

  function handleChange(v: string) {
    onChange(v)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fetchPredictions(v), 300)
  }

  async function selectPlace(p: Prediction) {
    setOpen(false)
    setPredictions([])
    try {
      const res = await fetch(`/api/places?type=details&place_id=${encodeURIComponent(p.place_id)}`)
      const data = await res.json()
      const comps: Array<{ types: string[]; long_name: string; short_name: string }> = data.result?.address_components || []

      let streetNumber = ''
      let route = ''
      let city = ''
      let province = ''
      let postalCode = ''

      for (const c of comps) {
        if (c.types.includes('street_number')) streetNumber = c.long_name
        else if (c.types.includes('route')) route = c.long_name
        else if (c.types.includes('locality')) city = c.long_name
        else if (c.types.includes('administrative_area_level_1')) province = c.short_name
        else if (c.types.includes('postal_code')) postalCode = c.long_name
      }

      const street = [streetNumber, route].filter(Boolean).join(' ') || p.structured_formatting.main_text
      onChange(street)
      onSelect({ street, city, province, postalCode })
    } catch {
      onChange(p.structured_formatting.main_text)
      onSelect({ street: p.structured_formatting.main_text, city: '', province: '', postalCode: '' })
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={e => handleChange(e.target.value)}
        onBlur={onBlur}
        style={{
          width: '100%',
          border: error ? '1.5px solid #C0341A' : '1.5px solid #E5E7EB',
          borderRadius: 10,
          padding: '12px 14px',
          fontSize: 15,
          background: '#fff',
          outline: 'none',
          boxSizing: 'border-box',
          fontFamily: 'inherit',
          color: '#0A1628',
        }}
      />
      {open && predictions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300,
          background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4, overflow: 'hidden',
        }}>
          {predictions.map(p => (
            <button
              key={p.place_id}
              type="button"
              onMouseDown={e => { e.preventDefault(); selectPlace(p) }}
              style={{
                width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                padding: '10px 14px', border: 'none', borderBottom: '1px solid #F1F5F9',
                background: '#fff', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: '#0A1628' }}>{p.structured_formatting.main_text}</span>
              <span style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>{p.structured_formatting.secondary_text}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
