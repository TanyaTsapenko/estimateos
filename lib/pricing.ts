export const OPENING_TYPES: Record<string, { name: string; base: number; lab: number; icon: string }> = {
  window_dh:    { name: 'Double-Hung Window',  base: 700,  lab: 300, icon: '🪟' },
  window_cas:   { name: 'Casement Window',     base: 850,  lab: 320, icon: '🪟' },
  window_bay:   { name: 'Bay / Bow Window',    base: 2200, lab: 600, icon: '🏠' },
  window_sl:    { name: 'Sliding Window',      base: 750,  lab: 280, icon: '🪟' },
  window_fix:   { name: 'Fixed / Picture',     base: 600,  lab: 250, icon: '⬜' },
  door_entry:   { name: 'Entry Door',          base: 1400, lab: 450, icon: '🚪' },
  door_patio:   { name: 'Patio Sliding Door',  base: 1800, lab: 500, icon: '🚪' },
  door_french:  { name: 'French Doors',        base: 2200, lab: 580, icon: '🚪' },
  door_storm:   { name: 'Storm Door',          base: 600,  lab: 200, icon: '🚪' },
  door_int:     { name: 'Interior Door',       base: 350,  lab: 180, icon: '🚪' },
}

export const TAX_RATES: Record<string, [number, string]> = {
  AB: [0.05,    'GST (5%)'],
  BC: [0.12,    'HST (12%)'],
  MB: [0.12,    'GST+PST (12%)'],
  NB: [0.15,    'HST (15%)'],
  NL: [0.15,    'HST (15%)'],
  NS: [0.15,    'HST (15%)'],
  NT: [0.05,    'GST (5%)'],
  NU: [0.05,    'GST (5%)'],
  ON: [0.13,    'HST (13%)'],
  PE: [0.15,    'HST (15%)'],
  QC: [0.14975, 'QST+GST (14.975%)'],
  SK: [0.11,    'PST+GST (11%)'],
  YT: [0.05,    'GST (5%)'],
}

export interface Opening {
  id: string
  type: string
  qty: number
  width: string        // size bucket: sm|md|lg|xl (derived from dims or set manually)
  width_in?: number    // actual width in inches
  height_in?: number   // actual height in inches
  shape: string
  colour: string
  glass: string
  frame: string
  install: string
  floor: string
  room: string
  sidelight: number
  transom: number
  screen: number
}

// Derive sm/md/lg/xl from measured area (sq in)
export function dimToSizeBucket(wIn: number, hIn: number): string {
  const area = wIn * hIn
  return area >= 2500 ? 'xl' : area >= 1400 ? 'lg' : area >= 700 ? 'md' : 'sm'
}

export const DEFAULT_SIZE_MULTS = { sm: 0.85, md: 1.0, lg: 1.2, xl: 1.4 }

export interface CustomPrices {
  sizes: { sm: number; md: number; lg: number; xl: number }
  types: Record<string, { base: number; lab: number }>
}

export function opCost(op: Opening, mult: number, custom?: CustomPrices): number {
  const defaults = OPENING_TYPES[op.type] ?? OPENING_TYPES['window_dh']
  const base = custom?.types[op.type]?.base ?? defaults.base
  const lab  = custom?.types[op.type]?.lab  ?? defaults.lab
  const sizes = custom?.sizes ?? DEFAULT_SIZE_MULTS
  const bucket = (op.width_in && op.height_in) ? dimToSizeBucket(op.width_in, op.height_in) : op.width
  const sz = bucket === 'sm' ? sizes.sm : bucket === 'lg' ? sizes.lg : bucket === 'xl' ? sizes.xl : sizes.md
  const sh = op.shape === 'arch' ? 1.3 : op.shape === 'custom' ? 1.5 : 1.0
  const fa = op.floor === 'second' ? 80 : op.floor === 'third' ? 180 : 0
  const ia = op.install === 'fullframe' ? 200 : 0
  const fc = op.frame === 'repair' ? 120 : op.frame === 'rotted' ? 280 : 0
  const col = op.colour === 'black' || op.colour === 'grey' ? 80 : op.colour === 'custom' ? 150 : 0
  const gl = op.glass === 'lowe' ? 60 : op.glass === 'frosted' ? 90 : op.glass === 'tinted' ? 70 : op.glass === 'tempered' ? 110 : 0
  const ex = (op.sidelight || 0) + (op.transom || 0) + (op.screen || 0)
  return ((base + lab) * sz * sh + fa + ia + fc + col + gl + ex) * mult * (op.qty || 1)
}

export function fmtCAD(n: number): string {
  return 'CA$' + Math.round(n).toLocaleString('en-CA')
}
