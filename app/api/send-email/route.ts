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

  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('*')

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
    : `<span style="font-size:16px;font-weight:800;color:#ffffff;letter-spacing:-0.01em;font-family:Arial,sans-serif">Estimate<span style="color:#2563EB">OS</span></span>`

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
        Sent via EstimateOS &middot; ${companyName}
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
      ? new Date(invoice.due_date + 'T00:00:00').toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
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
      ? new Date(est.signed_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
      : ''
    const signedTimeFmt = est.signed_at
      ? new Date(est.signed_at).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })
      : ''
    const tierLabel = (est.tier || 'better').charAt(0).toUpperCase() + (est.tier || 'better').slice(1)
    const depositPct = (prof as any)?.deposit_pct ?? 30
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
            <div style="font-size:12px;color:#94A3B8;font-family:Arial,sans-serif">inc. ${taxLabel} &middot; ${tierLabel} Package</div>
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
    const contractPdfUrl = (prof as any)?.contract_pdf_url || null
    const isContractOnly = sendMode === 'contract'
    const isEstimateContract = sendMode === 'estimate_contract'
    subject = isContractOnly
      ? `Your contract from ${companyName} — ${est.estimate_number}`
      : isEstimateContract
        ? `Your estimate & contract from ${companyName} — ${est.estimate_number}`
        : `Your estimate from ${companyName} — ${est.estimate_number}`
    const headerTitle = isContractOnly ? 'Your contract is ready' : 'Your estimate is ready'
    const bodyText = isContractOnly
      ? `<strong style="color:#0A1628">${companyName}</strong> has sent you a contract to review and sign.`
      : isEstimateContract
        ? `<strong style="color:#0A1628">${companyName}</strong> has prepared an estimate and contract for your project. Review the pricing and sign online &mdash; it takes less than a minute.`
        : `<strong style="color:#0A1628">${companyName}</strong> has prepared an estimate for your project. Review the details and sign online &mdash; it takes less than a minute.`
    const btnText = isContractOnly ? 'Review &amp; Sign Contract &rarr;' : isEstimateContract ? 'Review Estimate &amp; Contract &rarr;' : 'View &amp; Sign Estimate &rarr;'
    const tierLabel = (est.tier || 'better').toUpperCase()

    html = outerWrap(`
${hdrBlock('Prepared for', est.client_name || 'Client',
  pill(est.estimate_number, true) + pill(companyName)
)}
      <!-- BODY -->
      <tr><td style="${bodyStyle}">

        ${!isContractOnly ? `<!-- Estimate Total -->
        <table width="100%" cellpadding="0" cellspacing="0" style="${cardBase};border:1.5px solid #BFDBFE">
          <tr><td style="padding:16px">
            <div style="${slbl}">Estimate Total</div>
            <div style="font-size:32px;font-weight:800;color:#2563EB;line-height:1;margin-bottom:6px;font-family:Arial,sans-serif">${fmtCAD(est.total)}</div>
            <div style="font-size:12px;color:#94A3B8;font-family:Arial,sans-serif">inc. ${taxLabel} &middot; ${tierLabel} Package &middot; Valid until ${est.valid_until || '30 days'}</div>
          </td></tr>
        </table>` : ''}

        <!-- Message -->
        <table width="100%" cellpadding="0" cellspacing="0" style="${cardBase}">
          <tr><td style="padding:16px;font-size:13px;color:#64748B;line-height:1.7;font-family:Arial,sans-serif">
            ${bodyText}
          </td></tr>
        </table>

        <!-- CTA -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px">
          <tr><td align="center" style="padding:8px 0">
            <a href="${clientLink}" style="background:#2563EB;color:#ffffff;text-decoration:none;border-radius:12px;padding:14px 32px;font-size:14px;font-weight:700;font-family:Arial,sans-serif;display:inline-block">${btnText}</a>
          </td></tr>
        </table>


        <p style="font-size:12px;color:#9CA3AF;text-align:center;margin:8px 0 0;font-family:Arial,sans-serif">Questions? Contact ${companyName}${prof?.phone ? ` at ${prof.phone}` : ''}</p>

      </td></tr>
`)
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${companyName} via EstimateOS <onboarding@resend.dev>`,
      to: [est.client_email],
      subject,
      html,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, id: data?.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
