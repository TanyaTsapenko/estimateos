export const OPENING_TYPES: Record<string, { name: string; base: number; lab: number; icon: string }> = {
  window_combo: { name: 'Combination Window',   base: 1200, lab: 400, icon: '' },
  window_dh:    { name: 'Double-Hung Window',  base: 700,  lab: 300, icon: '' },
  window_cas:   { name: 'Casement Window',     base: 850,  lab: 320, icon: '' },
  window_bay:   { name: 'Bay Window',           base: 2200, lab: 600, icon: '' },
  window_bow:   { name: 'Bow Window',           base: 2400, lab: 620, icon: '' },
  window_sl:    { name: 'Sliding Window',      base: 750,  lab: 280, icon: '' },
  window_fix:   { name: 'Fixed / Picture',     base: 600,  lab: 250, icon: '' },
  window_sh:    { name: 'Single-Hung Window',  base: 650,  lab: 280, icon: '' },
  window_awn:   { name: 'Awning Window',       base: 780,  lab: 290, icon: '' },
  window_trans: { name: 'Transom Window',      base: 550,  lab: 220, icon: '' },
  window_arch:  { name: 'Arched Window',       base: 950,  lab: 350, icon: '' },
  window_tilt:  { name: 'Tilt & Turn Window',  base: 1100, lab: 380, icon: '' },
  window_egr:   { name: 'Egress Window',       base: 900,  lab: 400, icon: '' },
  door_entry:   { name: 'Entry Door',          base: 1400, lab: 450, icon: '' },
  door_patio:   { name: 'Patio Sliding Door',  base: 1800, lab: 500, icon: '' },
  door_french:  { name: 'French Doors',        base: 2200, lab: 580, icon: '' },
  door_storm:   { name: 'Storm Door',          base: 600,  lab: 200, icon: '' },
  door_int:     { name: 'Interior Door',       base: 350,  lab: 180, icon: '' },
  door_garden:  { name: 'Garden Door',         base: 1600, lab: 480, icon: '' },
  door_double:  { name: 'Double Entry Door',   base: 2800, lab: 650, icon: '' },
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
  has_screen: boolean
  material: string
  hardware_colour: string
  grid_pattern: string
  brand: string
  notes: string
  showMore?: boolean
  // Type-specific fields
  tilt_clean: boolean
  opening_direction: string
  panels_count: string
  bay_angle: string
  transom_panes: string
  sidelight_left: number
  sidelight_right: number
  transom_above: boolean
  glass_type: string
  core_type: string
  handle_type: string | null
  combo_sections: { type: string; width: number }[] | null
  custom_shape_label: string
  custom_colour_label: string
  colour_palette_id?: string | null
  colour_name?: string | null
}

// Derive sm/md/lg/xl from the larger of width or height (in inches)
// Small <24", Medium 24–36", Large 36–48", XL >48"
export function dimToSizeBucket(wIn: number, hIn: number): string {
  const dim = Math.max(wIn, hIn)
  return dim >= 48 ? 'xl' : dim >= 36 ? 'lg' : dim >= 24 ? 'md' : 'sm'
}

export interface CustomPrices {
  types: Record<string, { base: number; lab: number }>
  colourPalette?: Record<string, number>
  surcharges?: {
    arch_pct?: number
    custom_shape_pct?: number
    black_grey?: number
    custom_colour?: number
    lowe?: number
    frosted?: number
    tinted?: number
    tempered?: number
    fullframe?: number
    stud_to_stud?: number
    second_floor?: number
    third_floor?: number
    frame_repair?: number
    frame_rotted?: number
  }
}

export function opCost(op: Opening, custom?: CustomPrices): number {
  const customType = custom?.types[op.type]
  const s = custom?.surcharges || {}

  const defaults = OPENING_TYPES[op.type] ?? OPENING_TYPES['window_dh']
  const base = customType?.base ?? defaults.base
  const lab  = customType?.lab  ?? defaults.lab

  const sh = op.shape === 'arch' ? 1 + (s.arch_pct ?? 0) / 100
           : op.shape === 'custom' ? 1 + (s.custom_shape_pct ?? 0) / 100 : 1.0
  const col = op.colour_palette_id && custom?.colourPalette
    ? (custom.colourPalette[op.colour_palette_id] ?? 0)
    : op.colour === 'black' || op.colour === 'grey' ? (s.black_grey ?? 0)
    : op.colour === 'custom' ? (s.custom_colour ?? 0) : 0
  const gl = op.glass === 'lowe' ? (s.lowe ?? 0)
           : op.glass === 'frosted' ? (s.frosted ?? 0)
           : op.glass === 'tinted' ? (s.tinted ?? 0)
           : op.glass === 'tempered' ? (s.tempered ?? 0) : 0
  const fa = op.floor === 'second' ? (s.second_floor ?? 0)
           : op.floor === 'third' ? (s.third_floor ?? 0) : 0
  const ia = op.install === 'fullframe' ? (s.fullframe ?? 0)
           : op.install === 'stud_to_stud' ? (s.stud_to_stud ?? 0) : 0
  const fc = op.frame === 'repair' ? (s.frame_repair ?? 0)
           : op.frame === 'rotted' ? (s.frame_rotted ?? 0) : 0
  const ex = (op.sidelight || 0) + (op.transom || 0) + (op.screen || 0)

  const unitCost = (base + lab) * sh + fa + ia + fc + col + gl + ex
  return unitCost * (op.qty || 1)
}

export function fmtCAD(n: number): string {
  return 'CA$' + Math.round(n).toLocaleString('en-CA')
}
