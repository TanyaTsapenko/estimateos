export type SubtypeMap = Record<string, { key: string; label: string }[]>

const COLOUR_MAP: Record<string, string> = { white: 'White', black: 'Black', grey: 'Grey', custom: 'Custom colour' }
const SHAPE_MAP: Record<string, string> = {
  rect:       'Rectangle',
  arch:       'Arch',
  half_moon:  'Half Moon',
  full_circle:'Full Circle',
  oval:       'Oval',
  triangle:   'Triangle',
  trapezoid:  'Trapezoid',
  pentagon:   'Pentagon',
  octagon:    'Octagon',
  eyebrow:    'Eyebrow',
  gothic:     'Gothic',
  custom:     'Custom shape',
}
const ARCH_POSITION_MAP: Record<string, string> = {
  full:    'Full Arch',
  half:    'Half Arch',
  quarter: 'Quarter Arch',
}
const GLASS_MAP:      Record<string, string> = { clear: 'Clear', lowe: 'Low-E', frosted: 'Frosted', tinted: 'Tinted', tempered: 'Tempered' }
const GLASS_KIND_MAP: Record<string, string> = { frosted: 'Frosted', tinted: 'Tinted', obscure: 'Obscure' }

export function getColourLabel(op: { colour?: string | null; custom_colour_label?: string | null; colour_name?: string | null }): string {
  if (op.colour_name) return op.colour_name
  if (!op.colour) return ''
  if (op.colour === 'custom') return op.custom_colour_label || 'Custom colour'
  return COLOUR_MAP[op.colour] || op.colour.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function getShapeLabel(op: { shape?: string | null; custom_shape_label?: string | null; shape_position?: string | null }): string {
  if (!op.shape) return ''
  if (op.shape === 'custom') return op.custom_shape_label || 'Custom shape'
  const base = SHAPE_MAP[op.shape] || op.shape
  if (op.shape === 'arch' && op.shape_position && op.shape_position !== 'full') {
    return `${base} (${ARCH_POSITION_MAP[op.shape_position] || op.shape_position})`
  }
  return base
}

export function getInteriorColourLabel(op: { interior_colour?: string | null; interior_colour_name?: string | null }): string {
  if (op.interior_colour_name) return op.interior_colour_name
  if (!op.interior_colour || op.interior_colour === 'white') return ''
  return COLOUR_MAP[op.interior_colour] || op.interior_colour.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function getSubtypeLabel(
  op: { window_subtype?: string | null; type?: string | null },
  subtypesByType?: SubtypeMap | null,
): string {
  if (!op.window_subtype) return ''
  if (subtypesByType && op.type) {
    const found = subtypesByType[op.type]?.find(s => s.key === op.window_subtype)
    if (found) return found.label
  }
  // Fallback: humanise the raw key (e.g. "left_casement" → "Left Casement")
  return op.window_subtype.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function getGlassLabel(op: { glass?: string | null; glass_kind?: string | null; low_e?: boolean | null; tempered?: boolean | null; pane?: string | null }): string {
  const parts: string[] = []
  if (op.pane === 'triple') parts.push('Triple Pane')
  else if (op.pane === 'double') parts.push('Double Pane')
  if (op.glass_kind != null) {
    if (op.glass_kind && op.glass_kind !== 'clear') parts.push(GLASS_KIND_MAP[op.glass_kind] || op.glass_kind)
    if (op.low_e) parts.push('Low-E')
    if (op.tempered) parts.push('Tempered')
  } else {
    // Legacy fallback for rows without new columns
    if (op.glass && op.glass !== 'clear') parts.push(GLASS_MAP[op.glass] || op.glass)
  }
  return parts.join(', ')
}
