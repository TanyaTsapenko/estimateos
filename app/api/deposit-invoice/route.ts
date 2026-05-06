import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { TAX_RATES, fmtCAD } from '@/lib/pricing'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const { estimateId } = await request.json()
  if (!estimateId) return NextResponse.json({ error: 'Missing estimateId' }, { status: 400 })

  const admin = createAdminClient()

  const { data: est } = await admin.from('estimates').select('*').eq('id', estimateId).single()
  if (!est) return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })

  // Don't double-create
  const { data: existing } = await admin.from('invoices')
    .select('id').eq('estimate_id', estimateId).eq('invoice_type', 'deposit').single()
  if (existing) return NextResponse.json({ skipped: true, reason: 'deposit invoice already exists' })

  const { data: prof } = await admin.from('profiles')
    .select('company_name, first_name, last_name, phone, deposit_pct')
    .eq('id', est.user_id).single()

  const depositPct = prof?.deposit_pct ?? 30
  const depositAmount = Math.round(est.total * depositPct) / 100

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 7)
  const dueDateStr = dueDate.toISOString().slice(0, 10)

  const { count } = await admin.from('invoices')
    .select('*', { count: 'exact', head: true }).eq('user_id', est.user_id)
  const invoiceNum = `INV-${String((count || 0) + 1).padStart(4, '0')}`

  const companyName = prof?.company_name
    || `${prof?.first_name || ''} ${prof?.last_name || ''}`.trim()
    || 'Contractor'

  const { data: invoice, error: invErr } = await admin.from('invoices').insert({
    estimate_id:    estimateId,
    user_id:        est.user_id,
    invoice_number: invoiceNum,
    invoice_type:   'deposit',
    status:         'pending',
    amount:         depositAmount,
    due_date:       dueDateStr,
    notes:          `${depositPct}% deposit on ${est.estimate_number} — ${companyName}`,
  }).select().single()

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })

  // Send email if client has an email address
  if (est.client_email) {
    const [, taxLabel] = TAX_RATES[est.client_province || 'AB'] || [0.05, 'Tax']
    const estimateLink = `${request.nextUrl.origin}/estimate/${estimateId}`

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#E8E9EC">
<div style="max-width:520px;margin:0 auto;padding:28px 16px">

  <div style="background:linear-gradient(135deg,#0A0E1A 0%,#0D1630 50%,#1A2744 100%);border-radius:16px 16px 0 0;padding:32px 28px">
    <div style="font-size:18px;font-weight:800;color:#fff;letter-spacing:-.01em;margin-bottom:20px">Estimate<span style="color:#3B6CFF">OS</span></div>
    <div style="font-size:22px;font-weight:800;color:#fff;margin-bottom:4px">Deposit Invoice</div>
    <div style="font-size:13px;color:rgba(255,255,255,.5)">${invoiceNum} · ${companyName}</div>
  </div>

  <div style="background:#fff;border-radius:0 0 16px 16px;padding:28px">
    <p style="font-size:14px;color:#1A1A1A;font-weight:600;margin:0 0 8px">Hi ${est.client_name || 'there'},</p>
    <p style="font-size:13px;color:#6b7280;line-height:1.7;margin:0 0 24px">
      Thank you for signing <strong style="color:#1A1A1A">${est.estimate_number}</strong>! To get started, a <strong style="color:#1A1A1A">${depositPct}% deposit</strong> is due within 7 days.
    </p>

    <div style="background:#F4F5F7;border:1.5px solid #1A2744;border-radius:12px;padding:18px;margin-bottom:24px">
      <div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#2045B8;margin-bottom:12px">Deposit Invoice ${invoiceNum}</div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:6px">
        <span>Project total</span>
        <span style="font-weight:600;color:#1A1A1A">${fmtCAD(est.total)} inc. ${taxLabel}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:14px">
        <span>Deposit rate</span>
        <span style="font-weight:600;color:#1A1A1A">${depositPct}%</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;border-top:1.5px solid #1A2744;padding-top:14px">
        <div>
          <div style="font-size:13px;font-weight:700;color:#1A1A1A">Amount due now</div>
          <div style="font-size:11px;color:#9ca3af;margin-top:2px">Due by ${new Date(dueDateStr).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
        </div>
        <span style="font-size:26px;font-weight:800;color:#2045B8">${fmtCAD(depositAmount)}</span>
      </div>
    </div>

    <div style="text-align:center;margin-bottom:24px">
      <a href="${estimateLink}" style="background:#3B6CFF;color:#fff;text-decoration:none;border-radius:10px;padding:13px 28px;font-size:13px;font-weight:700;display:inline-block">
        View Signed Estimate →
      </a>
    </div>

    <p style="font-size:11px;color:#9ca3af;line-height:1.7;text-align:center">
      Remaining balance of <strong style="color:#6b7280">${fmtCAD(est.total - depositAmount)}</strong> is due upon project completion.${prof?.phone ? `<br>Questions? Call ${prof.phone}` : ''}
    </p>
  </div>

  <p style="text-align:center;font-size:10px;color:#9ca3af;margin-top:16px">Sent via EstimateOS · ${companyName}</p>
</div>
</body>
</html>`

    try {
      await resend.emails.send({
        from: `${companyName} via EstimateOS <onboarding@resend.dev>`,
        to: [est.client_email],
        subject: `Deposit Invoice ${invoiceNum} — ${fmtCAD(depositAmount)} due · ${companyName}`,
        html,
      })
    } catch {}
  }

  return NextResponse.json({ success: true, invoice })
}
