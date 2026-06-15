const COLOUR_MAP: Record<string, string> = { white: 'White', black: 'Black', grey: 'Grey', custom: 'Custom colour' }
const SHAPE_MAP:  Record<string, string> = { rect: 'Rectangle', arch: 'Arch', custom: 'Custom shape' }
const GLASS_MAP:  Record<string, string> = { clear: 'Clear', lowe: 'Low-E', frosted: 'Frosted', tinted: 'Tinted', tempered: 'Tempered' }

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

export function getGlassLabel(op: { glass?: string | null }): string {
  if (!op.glass) return ''
  return GLASS_MAP[op.glass] || op.glass
}
