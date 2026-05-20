export function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10)
  if (d.length <= 3) return d
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

export function validateName(v: string): string | null {
  return v.trim().length >= 2 ? null : 'Name must be at least 2 characters'
}

export function validatePhone(v: string): string | null {
  if (!v.trim()) return null
  return v.replace(/\D/g, '').length === 10 ? null : 'Please enter a valid 10-digit phone number'
}

export function validateEmail(v: string): string | null {
  if (!v.trim()) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : 'Please enter a valid email address'
}

export function validateAddress(v: string): string | null {
  if (!v.trim()) return null
  return v.trim().length >= 5 ? null : 'Please enter a valid address'
}

export type ClientErrors = Partial<Record<'client_name' | 'client_phone' | 'client_email' | 'client_address', string | null>>

export function hasErrors(e: ClientErrors): boolean {
  return Object.values(e).some(v => !!v)
}
