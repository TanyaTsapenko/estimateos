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
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#F5F5F5">
<div style="max-width:500px;margin:0 auto;padding:24px 16px">
  <div style="background:linear-gradient(135deg,#1A1A1A,#353A3E);border-radius:16px 16px 0 0;padding:28px 24px">
    <div style="font-size:20px;font-weight:800;color:#fff">Estimate<span style="color:#D97706">OS</span></div>
    <div style="font-size:22px;font-weight:800;color:#fff;margin-top:12px">Deposit Invoice</div>
    <div style="font-size:13px;color:rgba(255,255,255,.55);margin-top:4px">${invoiceNum} · ${companyName}</div>
  </div>
  <div style="background:#fff;border-radius:0 0 16px 16px;padding:24px">
    <p style="font-size:14px;color:#1A1A1A;margin-bottom:14px">Hi ${est.client_name || 'there'},</p>
    <p style="font-size:13px;color:#6b7280;line-height:1.6;margin-bottom:20px">
      Thank you for signing ${est.estimate_number}! To get started, a <strong>${depositPct}% deposit</strong> is due within 7 days.
    </p>
    <div style="background:#FEF3C7;border:1px solid #FCD34D;border-radius:12px;padding:16px;margin-bottom:20px">
      <div style="font-size:10px;color:#92400E;font-weight:700;letter-spacing:.1em;margin-bottom:8px">DEPOSIT INVOICE ${invoiceNum}</div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:4px">
        <span>Project total</span><span style="font-weight:600;color:#1A1A1A">${fmtCAD(est.total)} inc. ${taxLabel}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:10px">
        <span>Deposit (${depositPct}%)</span><span style="font-weight:700;color:#D97706">${fmtCAD(depositAmount)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:800;border-top:1px solid #FCD34D;padding-top:10px">
        <span style="color:#92400E">Amount due now</span><span style="color:#D97706">${fmtCAD(depositAmount)}</span>
      </div>
      <div style="font-size:11px;color:#B45309;margin-top:6px">Due by ${new Date(dueDateStr).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
    </div>
    <div style="text-align:center;margin-bottom:20px">
      <a href="${estimateLink}" style="background:linear-gradient(135deg,#b45309,#D97706);color:#fff;text-decoration:none;border-radius:10px;padding:12px 24px;font-size:13px;font-weight:700;display:inline-block">
        View Signed Estimate →
      </a>
    </div>
    <p style="font-size:11px;color:#BFBFBF;line-height:1.6">
      The remaining balance of <strong>${fmtCAD(est.total - depositAmount)}</strong> will be due upon project completion.
      ${prof?.phone ? `Contact us at ${prof.phone} with any questions.` : ''}
    </p>
  </div>
  <p style="text-align:center;font-size:10px;color:#BFBFBF;margin-top:16px">Sent via EstimateOS · ${companyName}</p>
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
