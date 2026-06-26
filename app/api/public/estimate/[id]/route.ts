import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

function isUUID(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

const ESTIMATE_COLS = [
  'id', 'estimate_number', 'client_name', 'client_email', 'client_phone',
  'client_address', 'client_city', 'client_province', 'status',
  'subtotal', 'tax_rate', 'tax_amount', 'total',
  'discount_type', 'discount_value', 'discount_amount',
  'scope_notes', 'valid_until', 'created_at', 'user_id',
  'signed_at', 'client_signature_url',
].join(', ')

const PROFILE_COLS = [
  'company_name', 'address', 'city', 'province', 'postal',
  'phone', 'logo_url', 'contract_terms', 'deposit_percent',
].join(', ')

const OPENING_COLS = [
  'id', 'type', 'qty', 'total_cost', 'room', 'install', 'shape', 'colour', 'glass',
  'frame', 'floor', 'width_in', 'height_in', 'material',
  'grid_pattern', 'brand', 'notes', 'has_screen', 'tilt_clean', 'opening_direction',
  'panels_count', 'bay_angle', 'transom_panes', 'sidelight_left', 'sidelight_right',
  'transom_above', 'glass_type', 'core_type', 'custom_shape_label', 'custom_colour_label',
  'colour_palette_id', 'colour_name', 'interior_photo_url', 'exterior_photo_url',
  'photo_3_url', 'photo_4_url', 'glass_kind', 'low_e', 'tempered',
  'interior_colour_palette_id', 'interior_colour_name', 'interior_colour', 'window_subtype',
].join(', ')

type Row = Record<string, unknown>

async function row(q: PromiseLike<unknown>): Promise<Row | null> {
  const res = (await q) as { data: Row | null }
  return res.data ?? null
}

async function rows(q: PromiseLike<unknown>): Promise<Row[]> {
  const res = (await q) as { data: Row[] | null }
  return res.data ?? []
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isUUID(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const svc = createServiceClient()

  const estimate = await row(
    svc.from('estimates').select(ESTIMATE_COLS).eq('id', id).maybeSingle()
  )
  if (!estimate) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [profile, openings] = await Promise.all([
    row(svc.from('profiles').select(PROFILE_COLS).eq('id', estimate.user_id as string).maybeSingle()),
    rows(svc.from('estimate_openings').select(OPENING_COLS).eq('estimate_id', id).order('sort_order')),
  ])

  return NextResponse.json({ estimate, profile, openings })
}
