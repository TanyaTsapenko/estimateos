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
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    console.log('[Places] AddressAutocomplete mounted')
  }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Recalculate dropdown position using fixed coords to escape overflow:hidden parents
  function updateDropdownPosition() {
    if (!inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      background: '#fff',
      border: '1.5px solid #E5E7EB',
      borderRadius: 10,
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      overflow: 'hidden',
    })
  }

  async function fetchPredictions(input: string) {
    if (input.length < 3) { setPredictions([]); setOpen(false); return }
    try {
      const res = await fetch(`/api/places?type=autocomplete&input=${encodeURIComponent(input)}`)
      if (!res.ok) {
        console.error('[Places] /api/places returned', res.status, await res.text())
        return
      }
      const data = await res.json()
      if (data.error) console.error('[Places] API error:', data.error)
      if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.error('[Places] Google status:', data.status, data.error_message)
      }
      const list: Prediction[] = data.predictions || []
      setPredictions(list)
      if (list.length > 0) {
        updateDropdownPosition()
        setOpen(true)
      } else {
        setOpen(false)
      }
    } catch (e) {
      console.error('[Places] fetch error:', e)
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
      if (!res.ok) {
        console.error('[Places] details returned', res.status)
        onChange(p.structured_formatting.main_text)
        onSelect({ street: p.structured_formatting.main_text, city: '', province: '', postalCode: '' })
        return
      }
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
    } catch (e) {
      console.error('[Places] selectPlace error:', e)
      onChange(p.structured_formatting.main_text)
      onSelect({ street: p.structured_formatting.main_text, city: '', province: '', postalCode: '' })
    }
  }

  return (
    <>
      <input
        ref={inputRef}
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
        <div style={dropdownStyle}>
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
    </>
  )
}
