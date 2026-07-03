import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

function isUUID(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

const CONTRACT_COLS = [
  'id', 'estimate_id', 'profile_id', 'status',
  'contract_terms_snapshot', 'contractor_signature_url', 'client_signature_url',
  'company_name', 'company_email', 'company_phone',
  'signed_at', 'created_at', 'payment_method', 'deposit_percent',
].join(', ')

const ESTIMATE_COLS = [
  'id', 'estimate_number', 'created_at', 'client_name', 'client_email', 'client_phone',
  'client_address', 'client_city', 'client_province', 'client_postal_code',
  'subtotal', 'tax_amount', 'total', 'discount_amount',
  'trim_casing', 'trim_casing_size', 'trim_jamb', 'trim_jamb_extension_depth',
  'trim_jamb_extension_depth_custom', 'trim_brickmold', 'trim_brickmold_colour_name',
  'trim_rosettes', 'trim_caping', 'trim_nail_fin', 'trim_drip_cap', 'trim_blue_skin',
].join(', ')

const OPENING_COLS = 'id, type, qty, total_cost, window_subtype, width_in, height_in, colour, colour_name, custom_colour_label, glass, glass_kind, low_e, tempered, shape, has_screen'

const PROFILE_COLS = [
  'deposit_percent', 'deposit_required', 'signature_url', 'warranty_period',
  'cancellation_policy', 'contract_terms', 'completion_timeframe', 'payment_methods',
  'customer_responsibilities', 'buyer_right_to_cancel', 'damage_disclaimer',
  'permits_responsibility', 'project_manager', 'logo_url', 'phone', 'website',
  'city', 'province', 'address', 'postal', 'contract_clauses', 'deposit_timing',
  'company_contact_email', 'gst_hst_number', 'licence',
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

  const contract = await row(
    svc.from('contracts').select(CONTRACT_COLS).eq('id', id).maybeSingle()
  )
  if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [estimate, openings, profile] = await Promise.all([
    row(svc.from('estimates').select(ESTIMATE_COLS).eq('id', contract.estimate_id as string).maybeSingle()),
    rows(svc.from('estimate_openings').select(OPENING_COLS).eq('estimate_id', contract.estimate_id as string).order('sort_order')),
    row(svc.from('profiles').select(PROFILE_COLS).eq('id', contract.profile_id as string).maybeSingle()),
  ])

  return NextResponse.json({ contract, estimate, openings, profile })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!isUUID(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const body = await req.json()
  if (body?.action !== 'decline') return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  const svc = createServiceClient()

  const contract = await row(
    svc.from('contracts').select('id, status').eq('id', id).maybeSingle()
  )
  if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (contract.status === 'signed') return NextResponse.json({ error: 'Already signed' }, { status: 409 })

  const { error } = await svc.from('contracts').update({ status: 'declined' }).eq('id', id)
  if (error) return NextResponse.json({ error: String(error) }, { status: 500 })

  return NextResponse.json({ ok: true })
}
