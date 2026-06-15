const COLOUR_MAP: Record<string, string> = { white: 'White', black: 'Black', grey: 'Grey', custom: 'Custom colour' }
const SHAPE_MAP:  Record<string, string> = { rect: 'Rectangle', arch: 'Arch', custom: 'Custom shape' }
const GLASS_MAP:      Record<string, string> = { clear: 'Clear', lowe: 'Low-E', frosted: 'Frosted', tinted: 'Tinted', tempered: 'Tempered' }
const GLASS_KIND_MAP: Record<string, string> = { frosted: 'Frosted', tinted: 'Tinted', obscure: 'Obscure' }

export function getColourLabel(op: { colour?: string | null; custom_colour_label?: string | null; colour_name?: string | null }): string {
  if (op.colour_name) return op.colour_name
  if (!op.colour) return ''
  if (op.colour === 'custom') return op.custom_colour_label || 'Custom colour'
  return COLOUR_MAP[op.colour] || op.colour
}

export function getShapeLabel(op: { shape?: string | null; custom_shape_label?: string | null }): string {
  if (!op.shape) return ''
  if (op.shape === 'custom') return op.custom_shape_label || 'Custom shape'
  return SHAPE_MAP[op.shape] || op.shape
}

export function getGlassLabel(op: { glass?: string | null; glass_kind?: string | null; low_e?: boolean | null; tempered?: boolean | null }): string {
  if (op.glass_kind != null) {
    const parts: string[] = []
    if (op.glass_kind && op.glass_kind !== 'clear') parts.push(GLASS_KIND_MAP[op.glass_kind] || op.glass_kind)
    if (op.low_e) parts.push('Low-E')
    if (op.tempered) parts.push('Tempered')
    return parts.join(', ')
  }
  // Legacy fallback for rows without new columns
  if (!op.glass || op.glass === 'clear') return ''
  return GLASS_MAP[op.glass] || op.glass
}
