// Shared utilities for Trim & Finishing display across Review, detail page, PDF, and contract

export type TrimRow = {
  trim_casing?: string | null
  trim_casing_size?: string | null
  trim_jamb?: string | null
  trim_jamb_extension_depth?: string | null
  trim_jamb_extension_depth_custom?: string | null
  trim_brickmold?: boolean | null
  trim_brickmold_colour_name?: string | null
  trim_rosettes?: string | null
  trim_caping?: boolean | null
  trim_nail_fin?: boolean | null
  trim_drip_cap?: boolean | null
  trim_blue_skin?: boolean | null
}

const CASING_LABELS: Record<string, string> = { oak: 'Oak', vinyl: 'Vinyl', mdf: 'MDF', custom: 'Custom' }
const JAMB_LABELS: Record<string, string> = { oak: 'Oak', wood: 'Wood', vinyl: 'Vinyl', plywood: 'Plywood', custom: 'Custom' }
const ROSETTE_LABELS: Record<string, string> = { round: 'Round', '45': '45°', flat: 'Flat' }
const SIZE_LABELS: Record<string, string> = { '2_3_8': '2-3/8"', '3_3_8': '3-3/8"' }

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

export function trimSummaryLines(row: TrimRow): { label: string; value: string }[] {
  const lines: { label: string; value: string }[] = []

  if (row.trim_casing && row.trim_casing !== 'none') {
    const mat = CASING_LABELS[row.trim_casing] || cap(row.trim_casing)
    const sz = row.trim_casing_size ? (SIZE_LABELS[row.trim_casing_size] || '') : ''
    lines.push({ label: 'Casing', value: sz ? `${mat} · ${sz}` : mat })
  }
  if (row.trim_jamb && row.trim_jamb !== 'none') {
    const mat = JAMB_LABELS[row.trim_jamb] || cap(row.trim_jamb)
    const depth = row.trim_jamb_extension_depth
    const depthStr = depth === 'Custom'
      ? (row.trim_jamb_extension_depth_custom || 'Custom size')
      : (depth || '4-9/16"')
    lines.push({ label: 'Jamb extension', value: `${mat} · ${depthStr}` })
  }
  if (row.trim_brickmold) {
    lines.push({ label: 'Brickmold', value: row.trim_brickmold_colour_name ? `Yes · ${row.trim_brickmold_colour_name}` : 'Yes' })
  }
  if (row.trim_rosettes && row.trim_rosettes !== 'none') {
    lines.push({ label: 'Rosettes', value: ROSETTE_LABELS[row.trim_rosettes] || cap(row.trim_rosettes) })
  }
  if (row.trim_caping)    lines.push({ label: 'Caping',    value: 'Yes' })
  if (row.trim_nail_fin)  lines.push({ label: 'Nail fin',  value: 'Yes' })
  if (row.trim_drip_cap)  lines.push({ label: 'Drip cap',  value: 'Yes' })
  if (row.trim_blue_skin) lines.push({ label: 'Self-Adhesive Flashing Membrane', value: 'Yes' })

  return lines
}

export function hasTrim(row: TrimRow): boolean {
  return trimSummaryLines(row).length > 0
}
