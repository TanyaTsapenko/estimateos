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
  const dueDateFmt = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(dueDateStr + 'T00:00:00'))

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

  if (est.client_email) {
    const estimateLink = `${request.nextUrl.origin}/estimate/${estimateId}`

    const slbl = 'font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#94A3B8;margin-bottom:10px;font-family:Arial,sans-serif'
    const dkeyStyle = 'font-size:13px;color:#94A3B8;padding:7px 0;border-bottom:1px solid #EEF0F4;font-family:Arial,sans-serif'
    const dvalStyle = 'font-size:13px;font-weight:600;color:#0A1628;padding:7px 0;border-bottom:1px solid #EEF0F4;text-align:right;font-family:Arial,sans-serif'
    const cardBase = 'background:#ffffff;border-radius:16px;margin-bottom:10px'

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#E2E5EC;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#E2E5EC;padding:20px 0">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:20px;overflow:hidden">

      <!-- HEADER -->
      <tr><td style="background-color:#080E1C;padding:28px 24px 52px">
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px">
          <tr><td><span style="font-size:16px;font-weight:800;color:#ffffff;letter-spacing:-0.01em;font-family:Arial,sans-serif">${companyName}</span></td></tr>
        </table>
        <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:6px;font-family:Arial,sans-serif">Invoice for</div>
        <div style="font-size:26px;font-weight:800;color:#ffffff;margin-bottom:14px;font-family:Arial,sans-serif;line-height:1.2">${est.client_name || 'Client'}</div>
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right:6px"><span style="background:#2563EB;color:#ffffff;border-radius:20px;padding:4px 12px;font-size:10px;font-weight:700;font-family:Arial,sans-serif">Payment Due</span></td>
            <td style="padding-right:6px"><span style="border:1px solid rgba(255,255,255,0.22);color:rgba(255,255,255,0.55);border-radius:20px;padding:4px 12px;font-size:10px;font-weight:600;font-family:Arial,sans-serif">${invoiceNum}</span></td>
            <td><span style="border:1px solid rgba(255,255,255,0.22);color:rgba(255,255,255,0.55);border-radius:20px;padding:4px 12px;font-size:10px;font-weight:600;font-family:Arial,sans-serif">Due ${dueDateFmt}</span></td>
          </tr>
        </table>
      </td></tr>

      <!-- BODY -->
      <tr><td style="background-color:#F5F6F8;padding:20px">

        <!-- Amount Due -->
        <table width="100%" cellpadding="0" cellspacing="0" style="${cardBase};border:1.5px solid #BFDBFE">
          <tr><td style="padding:16px">
            <div style="${slbl}">Amount Due</div>
            <div style="font-size:32px;font-weight:800;color:#2563EB;line-height:1;margin-bottom:6px;font-family:Arial,sans-serif">${fmtCAD(depositAmount)}</div>
            <div style="font-size:12px;color:#94A3B8;font-family:Arial,sans-serif">Due ${dueDateFmt} &middot; Net 14</div>
          </td></tr>
        </table>

        <!-- Invoice Details -->
        <table width="100%" cellpadding="0" cellspacing="0" style="${cardBase}">
          <tr><td style="padding:16px">
            <div style="${slbl}">Invoice Details</div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="${dkeyStyle}">Invoice number</td>
                <td style="${dvalStyle}">${invoiceNum}</td>
              </tr>
              <tr>
                <td style="${dkeyStyle}">Related estimate</td>
                <td style="${dvalStyle}">${est.estimate_number}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#94A3B8;padding:7px 0;font-family:Arial,sans-serif">Deposit rate</td>
                <td style="font-size:13px;font-weight:600;color:#0A1628;padding:7px 0;text-align:right;font-family:Arial,sans-serif">${depositPct}% of ${fmtCAD(est.total)}</td>
              </tr>
            </table>
          </td></tr>
        </table>

        <!-- Message -->
        <table width="100%" cellpadding="0" cellspacing="0" style="${cardBase}">
          <tr><td style="padding:16px;font-size:13px;color:#64748B;line-height:1.7;font-family:Arial,sans-serif">
            Please find your deposit invoice attached. A ${depositPct}% deposit of <strong style="color:#0A1628">${fmtCAD(depositAmount)}</strong> is due within 7 days to schedule your project. Thank you for choosing <strong style="color:#0A1628">${companyName}</strong>.
          </td></tr>
        </table>

        <!-- CTA -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px">
          <tr><td align="center" style="padding:8px 0">
            <a href="${estimateLink}" style="background:#059669;color:#ffffff;text-decoration:none;border-radius:12px;padding:14px 32px;font-size:14px;font-weight:700;font-family:Arial,sans-serif;display:inline-block">View Signed Estimate &rarr;</a>
          </td></tr>
        </table>

        <p style="font-size:12px;color:#9CA3AF;text-align:center;margin:8px 0 0;font-family:Arial,sans-serif">${prof?.phone ? `Questions? Call ${prof.phone}` : `Sent by ${companyName}`}</p>

      </td></tr>

      <!-- FOOTER -->
      <tr><td style="background:#ffffff;padding:14px 24px;text-align:center;font-size:11px;color:#9CA3AF;font-family:Arial,sans-serif">
        Powered by ApexScale
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`

    try {
      await resend.emails.send({
        from: `${companyName} <noreply@useapexscale.com>`,
        to: [est.client_email],
        subject: `Deposit Invoice ${invoiceNum} — ${fmtCAD(depositAmount)} due · ${companyName}`,
        html,
      })
    } catch (emailError) {
      console.error('[deposit-invoice] Failed to send email:', emailError)
    }
  } else {
    console.error('[deposit-invoice] skipped email: no client_email for estimate', est.id)
  }

  return NextResponse.json({ success: true, invoice })
}
