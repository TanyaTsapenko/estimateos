import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'
import { TAX_RATES, fmtCAD, OPENING_TYPES } from '@/lib/pricing'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const { estimateId: rawEstimateId, invoiceId, type, sendMode } = await request.json()

  const supabase = createServiceClient()
  let estimateId = rawEstimateId
  let invoice: any = null
  let openings: any[] = []

  if (type === 'invoice' && invoiceId) {
    const { data: inv } = await supabase.from('invoices').select('*').eq('id', invoiceId).single()
    invoice = inv
    if (!estimateId && inv) estimateId = inv.estimate_id
  }

  if (!estimateId) return NextResponse.json({ error: 'Missing estimateId' }, { status: 400 })

  const { data: est } = await supabase.from('estimates').select('*').eq('id', estimateId).single()
  if (!est || !est.client_email) return NextResponse.json({ error: 'No email' }, { status: 400 })

  const cleanUserId = (est.user_id ?? '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\x20-\x7E]/g, '')

  console.log('[send-email] est.user_id raw:', JSON.stringify(est.user_id))
  console.log('[send-email] cleanUserId:', JSON.stringify(cleanUserId))

  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('*')

  console.log('[send-email] profiles fetched:', profiles?.length ?? 0, 'error:', profError)
  if (profiles && profiles.length > 0) {
    console.log('[send-email] profile ids:', profiles.map((p: any) => p.id))
  }

  if (profError) {
    console.error('Error fetching profiles:', profError)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }

  const prof = (profiles ?? []).find(p => {
    const cleanProfileId = (p.id ?? '')
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^\x20-\x7E]/g, '')
    return cleanProfileId === cleanUserId
  }) ?? null

  console.log('[send-email] prof found:', !!prof, prof ? { id: prof.id, company_name: prof.company_name, phone: (prof as any).phone, email: (prof as any).email } : null)

  if (!prof) {
    console.error('Profile not found. cleanUserId:', JSON.stringify(cleanUserId))
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (type === 'invoice') {
    if (!invoice) {
      const { data: inv } = await supabase.from('invoices')
        .select('*').eq('estimate_id', estimateId)
        .order('created_at', { ascending: false }).limit(1).single()
      invoice = inv
    }
    const { data: ops } = await supabase.from('estimate_openings')
      .select('*').eq('estimate_id', estimateId).order('sort_order')
    openings = ops || []
  }

  const [, taxLabel] = TAX_RATES[est.client_province || 'AB'] || [0.05, 'Tax']
  const companyName = prof?.company_name || 'Your contractor'
  const clientLink = `${request.nextUrl.origin}/estimate/${estimateId}`
  const logoHtml = (prof as any)?.logo_url
    ? `<img src="${(prof as any).logo_url}" style="max-width:120px;max-height:40px;display:block" alt="${companyName}" />`
    : `<span style="font-size:16px;font-weight:800;color:#ffffff;letter-spacing:-0.01em;font-family:Arial,sans-serif">${companyName}</span>`

  const hdrStyle = 'background-color:#080E1C;padding:28px 24px 52px'
  const bodyStyle = 'background-color:#F5F6F8;padding:20px'
  const cardBase = 'background:#ffffff;border-radius:16px;margin-bottom:10px'
  const slbl = 'font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#94A3B8;margin-bottom:10px;font-family:Arial,sans-serif'
  const dkeyStyle = 'font-size:13px;color:#94A3B8;padding:7px 0;border-bottom:1px solid #EEF0F4;font-family:Arial,sans-serif'
  const dvalStyle = 'font-size:13px;font-weight:600;color:#0A1628;padding:7px 0;border-bottom:1px solid #EEF0F4;text-align:right;font-family:Arial,sans-serif'

  function outerWrap(inner: string) {
    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#E2E5EC;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#E2E5EC;padding:20px 0">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:20px;overflow:hidden">
${inner}
      <!-- FOOTER -->
      <tr><td style="background:#ffffff;padding:14px 24px;text-align:center;font-size:11px;color:#9CA3AF;font-family:Arial,sans-serif">
        Powered by ApexScale
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
  }

  function hdrBlock(kicker: string, clientName: string, pillsHtml: string) {
    return `      <!-- HEADER -->
      <tr><td style="${hdrStyle}">
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px">
          <tr><td>${logoHtml}</td></tr>
        </table>
        <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:6px;font-family:Arial,sans-serif">${kicker}</div>
        <div style="font-size:26px;font-weight:800;color:#ffffff;margin-bottom:14px;font-family:Arial,sans-serif;line-height:1.2">${clientName}</div>
        <table cellpadding="0" cellspacing="0"><tr>${pillsHtml}</tr></table>
      </td></tr>`
  }

  function pill(label: string, filled?: boolean) {
    const bg = filled ? 'background:#2563EB;color:#ffffff;' : 'border:1px solid rgba(255,255,255,0.22);color:rgba(255,255,255,0.55);'
    return `<td style="padding-right:6px"><span style="${bg}border-radius:20px;padding:4px 12px;font-size:10px;font-weight:${filled ? 700 : 600};font-family:Arial,sans-serif">${label}</span></td>`
  }

  function greenPill(label: string) {
    return `<td style="padding-right:6px"><span style="background:rgba(5,150,105,0.25);border:1px solid rgba(16,185,129,0.4);color:#6EE7B7;border-radius:20px;padding:4px 12px;font-size:10px;font-weight:700;font-family:Arial,sans-serif">${label}</span></td>`
  }

  let subject = ''
  let html = ''

  // ── INVOICE ──────────────────────────────────────────────────────────────────
  if (type === 'invoice' && invoice) {
    const dueDateFmt = invoice.due_date
      ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(invoice.due_date + 'T00:00:00'))
      : ''

    subject = `Invoice ${invoice.invoice_number} · ${fmtCAD(invoice.amount)} due ${dueDateFmt}`

    html = outerWrap(`
${hdrBlock('Invoice for', est.client_name || 'Client',
  pill('Payment Due', true) + pill(invoice.invoice_number) + (dueDateFmt ? pill(`Due ${dueDateFmt}`) : '')
)}
      <!-- BODY -->
      <tr><td style="${bodyStyle}">

        <!-- Amount Due -->
        <table width="100%" cellpadding="0" cellspacing="0" style="${cardBase};border:1.5px solid #BFDBFE">
          <tr><td style="padding:16px">
            <div style="${slbl}">Amount Due</div>
            <div style="font-size:32px;font-weight:800;color:#2563EB;line-height:1;margin-bottom:6px;font-family:Arial,sans-serif">${fmtCAD(invoice.amount)}</div>
            <div style="font-size:12px;color:#94A3B8;font-family:Arial,sans-serif">${dueDateFmt ? `Due ${dueDateFmt} &middot; ` : ''}Net 14</div>
          </td></tr>
        </table>

        <!-- Invoice Details -->
        <table width="100%" cellpadding="0" cellspacing="0" style="${cardBase}">
          <tr><td style="padding:16px">
            <div style="${slbl}">Invoice Details</div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="${dkeyStyle}">Invoice number</td>
                <td style="${dvalStyle}">${invoice.invoice_number}</td>
              </tr>
              <tr>
                <td style="${dkeyStyle.replace('border-bottom:1px solid #EEF0F4', est.payment_method ? 'border-bottom:1px solid #EEF0F4' : 'border-bottom:none')}">Related estimate</td>
                <td style="${dvalStyle.replace('border-bottom:1px solid #EEF0F4', est.payment_method ? 'border-bottom:1px solid #EEF0F4' : 'border-bottom:none')}">${est.estimate_number}</td>
              </tr>
              ${est.payment_method ? `<tr>
                <td style="font-size:13px;color:#94A3B8;padding:7px 0;font-family:Arial,sans-serif">Payment method</td>
                <td style="font-size:13px;font-weight:600;color:#0A1628;padding:7px 0;text-align:right;font-family:Arial,sans-serif">${est.payment_method}</td>
              </tr>` : ''}
            </table>
          </td></tr>
        </table>

        <!-- Message -->
        <table width="100%" cellpadding="0" cellspacing="0" style="${cardBase}">
          <tr><td style="padding:16px;font-size:13px;color:#64748B;line-height:1.7;font-family:Arial,sans-serif">
            Please find your invoice attached. Payment is due by <strong style="color:#0A1628">${dueDateFmt || 'the due date'}</strong>. Thank you for choosing <strong style="color:#0A1628">${companyName}</strong>.
          </td></tr>
        </table>

        <!-- CTA -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px">
          <tr><td align="center" style="padding:8px 0">
            <a href="${clientLink}" style="background:#059669;color:#ffffff;text-decoration:none;border-radius:12px;padding:14px 32px;font-size:14px;font-weight:700;font-family:Arial,sans-serif;display:inline-block">View Invoice &rarr;</a>
          </td></tr>
        </table>

        <p style="font-size:12px;color:#9CA3AF;text-align:center;margin:8px 0 0;font-family:Arial,sans-serif">Questions? Contact ${companyName}${prof?.phone ? ` at ${prof.phone}` : ''}</p>

      </td></tr>
`)

  // ── SIGNED ───────────────────────────────────────────────────────────────────
  } else if (type === 'signed') {
    const signedDateFmt = est.signed_at
      ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(est.signed_at))
      : ''
    const signedTimeFmt = est.signed_at
      ? new Date(est.signed_at).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })
      : ''
    const tierLabel = (est.tier || 'better').charAt(0).toUpperCase() + (est.tier || 'better').slice(1)
    const depositPct = (prof as any)?.deposit_percent ?? 30
    const depositOnSigning = Math.round(est.total * depositPct / 100)
    const depositOnDelivery = est.total - depositOnSigning

    subject = `Signed — ${est.estimate_number} · ${fmtCAD(est.total)}`
    html = outerWrap(`
${hdrBlock('Prepared for', est.client_name || 'Client',
  greenPill('&#10003; Signed') + pill(est.estimate_number) + (signedDateFmt ? pill(signedDateFmt) : '')
)}
      <!-- BODY -->
      <tr><td style="${bodyStyle}">

        <!-- Estimate Total -->
        <table width="100%" cellpadding="0" cellspacing="0" style="${cardBase};border:1.5px solid #BFDBFE">
          <tr><td style="padding:16px">
            <div style="${slbl}">Estimate Total</div>
            <div style="font-size:32px;font-weight:800;color:#2563EB;line-height:1;margin-bottom:6px;font-family:Arial,sans-serif">${fmtCAD(est.total)}</div>
            <div style="font-size:12px;color:#94A3B8;font-family:Arial,sans-serif">inc. ${taxLabel}</div>
          </td></tr>
        </table>

        <!-- Payment Schedule -->
        <table width="100%" cellpadding="0" cellspacing="0" style="${cardBase}">
          <tr><td style="padding:16px">
            <div style="${slbl}">Payment Schedule</div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="${dkeyStyle}">Deposit on signing (${depositPct}%)</td>
                <td style="${dvalStyle}">${fmtCAD(depositOnSigning)}</td>
              </tr>
              <tr>
                <td style="${dkeyStyle.replace('border-bottom:1px solid #EEF0F4', est.payment_method ? 'border-bottom:1px solid #EEF0F4' : 'border-bottom:none')}">Balance on completion</td>
                <td style="${dvalStyle.replace('color:#0A1628', 'color:#2563EB').replace('border-bottom:1px solid #EEF0F4', est.payment_method ? 'border-bottom:1px solid #EEF0F4' : 'border-bottom:none')}">${fmtCAD(depositOnDelivery)}</td>
              </tr>
              ${est.payment_method ? `<tr>
                <td style="font-size:13px;color:#94A3B8;padding:7px 0;font-family:Arial,sans-serif">Payment method</td>
                <td style="font-size:13px;font-weight:600;color:#0A1628;padding:7px 0;text-align:right;font-family:Arial,sans-serif">${est.payment_method}</td>
              </tr>` : ''}
            </table>
          </td></tr>
        </table>

        <!-- Message -->
        <table width="100%" cellpadding="0" cellspacing="0" style="${cardBase}">
          <tr><td style="padding:16px;font-size:13px;color:#64748B;line-height:1.7;font-family:Arial,sans-serif">
            Thank you for signing <strong style="color:#0A1628">${est.estimate_number}</strong>. We'll be in touch shortly to schedule the work and arrange the deposit.
          </td></tr>
        </table>

        <!-- Signed confirmation -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#ECFDF5;border:1.5px solid #BBF7D0;border-radius:16px;margin-bottom:10px">
          <tr><td style="padding:20px;text-align:center">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 12px">
              <tr><td width="40" height="40" style="width:40px;height:40px;background:#059669;border-radius:20px;text-align:center;vertical-align:middle">
                <span style="color:#ffffff;font-size:20px;font-weight:700;font-family:Arial,sans-serif;line-height:40px;display:block">&#10003;</span>
              </td></tr>
            </table>
            <div style="font-size:15px;font-weight:700;color:#065F46;margin-bottom:4px;font-family:Arial,sans-serif">Signed by ${est.client_name || 'Client'}</div>
            <div style="font-size:12px;color:#34D399;font-family:Arial,sans-serif">${signedDateFmt}${signedTimeFmt ? ` at ${signedTimeFmt}` : ''}</div>
          </td></tr>
        </table>

        <!-- CTA -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px">
          <tr><td align="center" style="padding:8px 0">
            <a href="${clientLink}" style="background:#2563EB;color:#ffffff;text-decoration:none;border-radius:12px;padding:14px 32px;font-size:14px;font-weight:700;font-family:Arial,sans-serif;display:inline-block">View Signed Estimate &rarr;</a>
          </td></tr>
        </table>

        <p style="font-size:12px;color:#9CA3AF;text-align:center;margin:8px 0 0;font-family:Arial,sans-serif">Questions? Contact ${companyName}${prof?.phone ? ` at ${prof.phone}` : ''}</p>

      </td></tr>
`)

  // ── SEND (estimate to client) ─────────────────────────────────────────────────
  } else if (type === 'send') {
    subject = `Your estimate from ${companyName} — ${est.estimate_number}`
    const projectAddress = [est.client_address, est.client_city].filter(Boolean).join(', ')
    const validUntilFmt = est.valid_until
      ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(est.valid_until + 'T00:00:00'))
      : '30 days'
    const estimateUrl = `https://useapexscale.com/estimate/${est.id}`

    html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="x-apple-disable-message-reformatting" />
<title>Your estimate is ready</title>
<style>
  body { margin:0; padding:0; background:#E9EDF5; -webkit-text-size-adjust:100%; }
  table { border-collapse:collapse; }
  img { border:0; line-height:100%; outline:none; text-decoration:none; }
  a { text-decoration:none; }
  .px { padding-left:40px; padding-right:40px; }
  @media (max-width:620px){
    .wrap { width:100% !important; }
    .px { padding-left:24px !important; padding-right:24px !important; }
    .h1 { font-size:24px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#E9EDF5;font-family:'Inter',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">

<!-- preheader (hidden in inbox preview) -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your custom estimate ${est.estimate_number} is ready to review.</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#E9EDF5;">
<tr><td align="center" style="padding:24px 12px 48px;">
  <table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(11,22,64,0.10);">

    <!-- top bar: estimate badge only -->
    <tr><td class="px" style="padding:24px 40px;border-bottom:1px solid #EEF1F6;" align="right">
      <span style="background:#EEF3FF;border-radius:99px;padding:6px 12px;font:800 11px/1 'Inter',Arial,sans-serif;letter-spacing:0.06em;color:#2563EB;">${est.estimate_number}</span>
    </td></tr>

    <!-- prepared for -->
    <tr><td class="px" style="padding:34px 40px 0;font:800 11px/1 'Inter',Arial,sans-serif;letter-spacing:0.2em;color:#94A0B4;text-transform:uppercase;">Prepared for</td></tr>
    <tr><td class="px" style="padding:8px 40px 0;font:800 34px/1.05 'Inter',Arial,sans-serif;letter-spacing:-0.03em;color:#0B1220;">${est.client_name}</td></tr>

    <!-- intro -->
    <tr><td class="px" style="padding:22px 40px 0;">
      <div class="h1" style="font:800 26px/1.2 'Inter',Arial,sans-serif;letter-spacing:-0.02em;color:#0B1220;">Your estimate is ready.</div>
      <div style="padding-top:12px;font:400 15px/1.6 'Inter',Arial,sans-serif;color:#475467;">We've prepared a custom estimate for your project at <span style="color:#0B1220;font-weight:600;">${projectAddress}</span>. Review your options below.</div>
    </td></tr>

    <!-- detail rows with blue left stripe -->
    <tr><td class="px" style="padding:24px 40px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E6EAF2;border-radius:14px;overflow:hidden;">
        <tr><td style="border-left:3px solid #2563EB;padding:14px 18px;border-bottom:1px solid #EEF1F6;">
          <table role="presentation" width="100%"><tr>
            <td style="font:600 13px/1 'Inter',Arial,sans-serif;color:#94A0B4;">Estimate</td>
            <td align="right" style="font:800 14px/1 'Inter',Arial,sans-serif;color:#0B1220;">${est.estimate_number}</td>
          </tr></table>
        </td></tr>
        <tr><td style="border-left:3px solid #2563EB;padding:14px 18px;">
          <table role="presentation" width="100%"><tr>
            <td style="font:600 13px/1 'Inter',Arial,sans-serif;color:#94A0B4;">Valid until</td>
            <td align="right" style="font:800 14px/1 'Inter',Arial,sans-serif;color:#0B1220;">${validUntilFmt}</td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>

    <!-- CTA -->
    <tr><td class="px" style="padding:26px 40px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="background:#2563EB;border-radius:14px;box-shadow:0 10px 24px rgba(37,99,235,0.32);">
        <a href="${estimateUrl}" style="display:block;padding:17px 0;font:800 15px/1 'Inter',Arial,sans-serif;color:#FFFFFF;">View estimate&nbsp;&nbsp;&rarr;</a>
      </td></tr></table>
    </td></tr>
    <tr><td align="center" style="padding:14px 40px 34px;font:400 13px/1.5 'Inter',Arial,sans-serif;color:#94A0B4;">Questions? ${(prof as any)?.phone ? `<a href="tel:${(prof as any).phone}" style="color:#94A0B4;text-decoration:none;">Contact ${prof?.company_name || ''}</a>` : (prof as any)?.email ? `<a href="mailto:${(prof as any).email}" style="color:#94A0B4;text-decoration:none;">Contact ${prof?.company_name || ''}</a>` : `Contact ${prof?.company_name || ''}`}</td></tr>

    <!-- footer -->
    <tr><td style="border-top:1px solid #EEF1F6;padding:20px 40px;text-align:center;font:400 12px/1.5 'Inter',Arial,sans-serif;color:#94A0B4;">
      Powered by <span style="font-weight:700;color:#475467;">ApexScale</span>
    </td></tr>

  </table>
</td></tr>
</table>

</body>
</html>`
  }

  const emailPayload: any = {
    from: `${companyName} <noreply@useapexscale.com>`,
    to: [est.client_email],
    subject,
    html,
    ...(type === 'send' && estimateId ? {
      tags: [{ name: 'estimate_id', value: estimateId }],
      open_tracking: true,
    } : {}),
  }
  console.log('RESEND PAYLOAD:', JSON.stringify({ from: emailPayload.from, to: emailPayload.to, subject: emailPayload.subject, htmlLength: html.length }))

  try {
    const { data, error } = await resend.emails.send(emailPayload)
    if (error) {
      console.error('RESEND ERROR:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    console.log('RESEND SUCCESS:', data?.id, '→ to:', est.client_email)
    return NextResponse.json({ success: true, id: data?.id, sentTo: est.client_email, subject })
  } catch (e: any) {
    console.error('RESEND EXCEPTION:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
