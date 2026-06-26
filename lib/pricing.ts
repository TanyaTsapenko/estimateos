import { type Opening as V2Opening, SETTINGS } from '@/lib/v2/openingTypes'

export const OPENING_TYPES: Record<string, { name: string; base: number; lab: number; icon: string }> = {
  window_combo: { name: 'Combination Window',   base: 1200, lab: 400, icon: '' },
  window_dh:    { name: 'Double-Hung Window',  base: 700,  lab: 300, icon: '' },
  window_cas:   { name: 'Casement Window',     base: 850,  lab: 320, icon: '' },
  window_bay:   { name: 'Bay Window',           base: 2200, lab: 600, icon: '' },
  window_bow:   { name: 'Bow Window',           base: 2400, lab: 620, icon: '' },
  window_sl:    { name: 'Sliding Window',      base: 750,  lab: 280, icon: '' },
  window_fix:   { name: 'Fixed / Picture',     base: 600,  lab: 250, icon: '' },
  window_sh:     { name: 'Single-Hung Window',  base: 650,  lab: 280, icon: '' },
  window_hopper: { name: 'Hopper Window',       base: 650,  lab: 280, icon: '' },
  window_awn:    { name: 'Awning Window',        base: 780,  lab: 290, icon: '' },
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
  BC: [0.12,    'GST+PST (12%)'],
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
  combo_sections: { type: string; width: number }[] | null
  custom_shape_label: string
  custom_colour_label: string
  colour_palette_id?: string | null
  colour_name?: string | null
  interior_photo_url?: string | null
  exterior_photo_url?: string | null
  photo_3_url?: string | null
  photo_4_url?: string | null
  glass_kind?: string
  low_e?: boolean
  tempered?: boolean
  interior_colour_palette_id?: string | null
  interior_colour_name?: string | null
  interior_colour?: string | null
  // Phase 3 subtype attributes
  window_subtype?: string
  pane?: string
  egress_required?: boolean
  shape_position?: string
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
    obscure?: number
    fullframe?: number
    stud_to_stud?: number
    second_floor?: number
    third_floor?: number
    frame_repair?: number
    frame_rotted?: number
    casing_oak?: number
    casing_vinyl?: number
    casing_mdf?: number
    casing_custom?: number
    casing_size_3_3_8?: number
    jamb_oak?: number
    jamb_wood?: number
    jamb_vinyl?: number
    jamb_plywood?: number
    jamb_custom?: number
    brickmold?: number
    rosettes_round?: number
    rosettes_45?: number
    rosettes_flat?: number
    caping?: number
    nail_fin?: number
    drip_cap?: number
    blue_skin?: number
    triple_pane?: number
    egress_required?: number
    // Glass & energy
    argon?: number
    laminated_glass?: number
    // Material (windows)
    material_wood?: number
    material_aluminum?: number
    material_fiberglass?: number
    material_composite?: number
    material_clad_wood?: number
    // Material (doors)
    door_fiberglass?: number
    door_wood?: number
    // Grid / grille
    grid_upcharge?: number
    // Hardware & security
    deadbolt?: number
    multipoint_lock?: number
    // Screen upgrades
    screen_retractable?: number
    screen_premium?: number
    // Pet door
    pet_door_s?: number
    pet_door_m?: number
    pet_door_l?: number
    // Non-standard jamb depth (per opening)
    jamb_nonstandard?: number
  }
}

/** @deprecated use computePrice() instead */
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
  const colInt = op.interior_colour_palette_id && custom?.colourPalette
    ? (custom.colourPalette[op.interior_colour_palette_id] ?? 0)
    : op.interior_colour === 'black' || op.interior_colour === 'grey' ? (s.black_grey ?? 0)
    : op.interior_colour === 'custom' ? (s.custom_colour ?? 0) : 0
  const gl = op.glass_kind != null
    ? (op.low_e     ? (s.lowe     ?? 0) : 0)
      + (op.tempered ? (s.tempered ?? 0) : 0)
      + (op.glass_kind === 'frosted' ? (s.frosted ?? 0)
        : op.glass_kind === 'tinted'  ? (s.tinted  ?? 0)
        : op.glass_kind === 'obscure' ? (s.obscure ?? 0) : 0)
    : op.glass === 'lowe'     ? (s.lowe     ?? 0)
    : op.glass === 'frosted'  ? (s.frosted  ?? 0)
    : op.glass === 'tinted'   ? (s.tinted   ?? 0)
    : op.glass === 'tempered' ? (s.tempered ?? 0) : 0
  const fa = op.floor === 'second' ? (s.second_floor ?? 0)
           : op.floor === 'third' ? (s.third_floor ?? 0) : 0
  const ia = op.install === 'fullframe' ? (s.fullframe ?? 0)
           : op.install === 'stud_to_stud' ? (s.stud_to_stud ?? 0) : 0
  const fc = op.frame === 'repair' ? (s.frame_repair ?? 0)
           : op.frame === 'rotted' ? (s.frame_rotted ?? 0) : 0
  const ex = (op.sidelight || 0) + (op.transom || 0) + (op.screen || 0)
  const tp = op.pane === 'triple' ? (s.triple_pane ?? 0) : 0
  const egr = op.egress_required ? (s.egress_required ?? 0) : 0

  const unitCost = (base + lab) * sh + fa + ia + fc + col + colInt + gl + ex + tp + egr
  return unitCost * (op.qty || 1)
}

export function fmtCAD(n: number): string {
  return 'CA$' + Math.round(n).toLocaleString('en-CA')
}

// ── v2 pricing (computePrice / computeTrimCost) ───────────────────

export type CustomPricing = {
  base?: Record<string, number>
  areaRatePerSqFt?: number
  surcharges?: Record<string, number>
  colourPalette?: Record<string, number>  // colour name → price_addon
}

const DOOR_TYPES = new Set(['entry', 'doubleEntry', 'french', 'garden', 'patio', 'storm', 'interior'])

const SIDE_UNIT_MAP: Record<string, string> = {
  'Casement': 'casement', 'Fixed': 'picture', 'Awning': 'awning',
  'Single Hung': 'singleHung', 'Double Hung': 'doubleHung',
}
const COMBO_SECTION_MAP: Record<string, string> = {
  'Picture': 'picture', 'Fixed': 'picture', 'Casement': 'casement',
  'Awning': 'awning', 'Slider': 'slider', 'Single Hung': 'singleHung',
}

function sectionPrice(typeId: string, w: number, h: number, custom?: CustomPricing): number {
  const base = (custom?.base ?? SETTINGS.pricing.base)[typeId] ?? 800
  const rate = custom?.areaRatePerSqFt ?? SETTINGS.pricing.areaRatePerSqFt
  return base + Math.round((w * h) / 144 * rate)
}

export function computePrice(op: V2Opening, custom?: CustomPricing): number {
  const v = op.vals
  const s = custom?.surcharges ?? {}

  const w = +(v.width || v.owidth || 32)
  const h = +(v.height || v.oheight || 48)

  let p: number
  if (op.typeId === 'bay' || op.typeId === 'bow') {
    const liteCount = parseInt(op.sub || '3') || 3
    const sectionW = w / liteCount
    const sideTypeId = SIDE_UNIT_MAP[String(v.sideUnit || 'Casement')] ?? 'casement'
    const centerKey = op.typeId === 'bow' ? v.panelType : v.centerWindowType
    const centerTypeId = SIDE_UNIT_MAP[String(centerKey || 'Fixed')] ?? 'picture'
    p = 2 * sectionPrice(sideTypeId, sectionW, h, custom)
      + (liteCount - 2) * sectionPrice(centerTypeId, sectionW, h, custom)
    p = Math.round(p * (1 + (s[op.typeId === 'bow' ? 'bow_surcharge' : 'bay_surcharge'] ?? 0) / 100))
  } else if (op.typeId === 'combination') {
    p = (op.sections ?? []).reduce((sum, sec) => {
      const secTypeId = COMBO_SECTION_MAP[sec.type] ?? 'picture'
      return sum + sectionPrice(secTypeId, sec.width, h, custom)
    }, 0)
    p = Math.round(p * (1 + (s.combination_surcharge ?? 0) / 100))
  } else {
    const base = (custom?.base ?? SETTINGS.pricing.base)[op.typeId] ?? 800
    const rate = custom?.areaRatePerSqFt ?? SETTINGS.pricing.areaRatePerSqFt
    p = base + Math.round((w * h) / 144 * rate)
  }

  // Installation type
  if (v.install === 'Full Frame') p += s.fullframe ?? 0
  else if (v.install === 'Stud-to-Stud') p += s.stud_to_stud ?? 0

  // Floor
  if (v.floor === '2nd floor') p += s.second_floor ?? 0
  else if (v.floor === '3rd floor') p += s.third_floor ?? 0

  // Frame condition
  if (v.condition === 'Needs Repair') p += s.frame_repair ?? 0
  else if (v.condition === 'Rotted') p += s.frame_rotted ?? 0

  // Egress
  if (v.egress === true) p += s.egress_required ?? 0

  // Pane & glass — $0 if surcharge not configured in Price List
  if (v.pane === 'Triple') p += s.triple_pane ?? 0
  if (v.lowE === true) p += s.lowe ?? 0
  if (v.argon === true) p += s.argon ?? 0
  if (v.tempered) p += s.tempered ?? 0
  if (v.laminatedGlass) p += s.laminated_glass ?? 0
  const glassType = String(v.glassType || '')
  if (glassType === 'Frosted') p += s.frosted ?? 0
  else if (glassType === 'Tinted') p += s.tinted ?? 0
  else if (glassType === 'Obscure') p += s.obscure ?? 0

  // Grid / grille
  if ((v.grid && v.grid !== 'None') || (v.grilleType && v.grilleType !== 'None')) {
    p += s.grid_upcharge ?? 0
  }

  // Screen type
  if (v.screen === 'Retractable') p += s.screen_retractable ?? 0
  else if (v.screen === 'Premium Mesh') p += s.screen_premium ?? 0

  // Colour — specific palette price overrides generic surcharge
  const anyColour = String(v.extColour || v.doorExt || v.colour || '')
  if (anyColour && anyColour !== 'White') {
    const paletteAddon = custom?.colourPalette?.[anyColour]
    p += (paletteAddon != null && paletteAddon > 0) ? paletteAddon : (s.custom_colour ?? 0)
  }

  // Material (door vs window distinguished by typeId)
  if (DOOR_TYPES.has(op.typeId)) {
    const dm = String(v.doorMaterial || '')
    if (dm === 'Wood') p += s.door_wood ?? 0
    else if (dm === 'Fiberglass') p += s.door_fiberglass ?? 0
  } else {
    const mat = String(v.material || '')
    if (mat === 'Wood') p += s.material_wood ?? 0
    else if (mat === 'Aluminum') p += s.material_aluminum ?? 0
    else if (mat === 'Fiberglass') p += s.material_fiberglass ?? 0
    else if (mat === 'Composite') p += s.material_composite ?? 0
    else if (mat === 'Clad Wood') p += s.material_clad_wood ?? 0
  }

  // Hardware & security
  if (v.deadbolt) p += s.deadbolt ?? 0
  if (v.multipointLock) p += s.multipoint_lock ?? 0

  // Pet door
  const petDoor = String(v.petDoor || '')
  if (petDoor === 'Small') p += s.pet_door_s ?? 0
  else if (petDoor === 'Medium') p += s.pet_door_m ?? 0
  else if (petDoor === 'Large') p += s.pet_door_l ?? 0

  // Non-standard brickmould or jamb depth (per-opening trim)
  const brickmould = String(v.brickmould || 'None')
  if (brickmould !== 'None') p += s.brickmold ?? 0
  const jambDepth = String(v.jamb || '4 9/16"')
  if (jambDepth !== '4 9/16"' && jambDepth !== '') p += s.jamb_nonstandard ?? 0

  // Shape multiplier (applied last, on the full unit cost)
  const shape = String(v.shape || '')
  if (shape === 'Arch') p = Math.round(p * (1 + (s.arch_pct ?? 0) / 100))
  else if (shape === 'Custom Shape') p = Math.round(p * (1 + (s.custom_shape_pct ?? 0) / 100))

  return p * ((v.qty as number) || 1)
}

// Structural type — matches TrimState from trim-section without creating a
// components→lib import cycle.
type TrimCostInput = {
  casing: string; casingSize: string; jamb: string
  brickmold: boolean; rosettes: string
  caping: boolean; nailFin: boolean; dripCap: boolean; blueSkin: boolean
}

export function computeTrimCost(trim: TrimCostInput, s: Record<string, number>): number {
  let cost = 0
  if (trim.casing === 'oak') cost += s.casing_oak ?? 0
  else if (trim.casing === 'vinyl') cost += s.casing_vinyl ?? 0
  else if (trim.casing === 'mdf') cost += s.casing_mdf ?? 0
  else if (trim.casing === 'custom') cost += s.casing_custom ?? 0
  if (trim.casing !== 'none' && trim.casingSize === '3_3_8') cost += s.casing_size_3_3_8 ?? 0
  if (trim.jamb === 'oak') cost += s.jamb_oak ?? 0
  else if (trim.jamb === 'wood') cost += s.jamb_wood ?? 0
  else if (trim.jamb === 'vinyl') cost += s.jamb_vinyl ?? 0
  else if (trim.jamb === 'plywood') cost += s.jamb_plywood ?? 0
  else if (trim.jamb === 'custom') cost += s.jamb_custom ?? 0
  if (trim.brickmold) cost += s.brickmold ?? 0
  if (trim.rosettes === 'round') cost += s.rosettes_round ?? 0
  else if (trim.rosettes === '45') cost += s.rosettes_45 ?? 0
  else if (trim.rosettes === 'flat') cost += s.rosettes_flat ?? 0
  if (trim.caping) cost += s.caping ?? 0
  if (trim.nailFin) cost += s.nail_fin ?? 0
  if (trim.dripCap) cost += s.drip_cap ?? 0
  if (trim.blueSkin) cost += s.blue_skin ?? 0
  return cost
}
