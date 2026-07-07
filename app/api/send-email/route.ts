import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'
import { logActivity } from '@/lib/activity'
import { TAX_RATES, fmtCAD, OPENING_TYPES } from '@/lib/pricing'
import { emailRateLimit } from '@/lib/rateLimit'
import { isValidEmail } from '@/lib/validation'
import { welcomeEmailHtml } from '@/emails/WelcomeEmail'
import { getCompanyName } from '@/lib/getCompanyName'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1'
  const { success } = await emailRateLimit.limit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { estimateId: rawEstimateId, invoiceId, type, sendMode, message: customMessage, firstName, email: recipientEmail } = await request.json()

  // ── WELCOME ───────────────────────────────────────────────────────────────────
  if (type === 'welcome') {
    if (!recipientEmail || !isValidEmail(recipientEmail)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }
    const { html, subject } = welcomeEmailHtml(firstName || '')
    try {
      await resend.emails.send({
        from: 'ApexScale <noreply@useapexscale.com>',
        to: [recipientEmail],
        subject,
        html,
      })
    } catch (e: any) {
      console.error('[send-email/welcome] resend error:', e.message)
    }
    return NextResponse.json({ success: true })
  }

  const supabase = createServiceClient()
  let estimateId = rawEstimateId
  let invoice: any = null
  let openings: any[] = []
  let depositInvForEmail: any = null

  if ((type === 'invoice' || type === 'deposit_receipt' || type === 'final_receipt') && invoiceId) {
    const { data: inv } = await supabase.from('invoices').select('*').eq('id', invoiceId).single()
    invoice = inv
    if (!estimateId && inv) estimateId = inv.estimate_id
  }

  if (!estimateId) return NextResponse.json({ error: 'Missing estimateId' }, { status: 400 })

  const { data: est } = await supabase.from('estimates').select('*').eq('id', estimateId).single()
  if (!est || !est.client_email) return NextResponse.json({ error: 'No email' }, { status: 400 })
  if (!isValidEmail(est.client_email)) return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })

  const cleanUserId = (est.user_id ?? '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\x20-\x7E]/g, '')

  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('*')

  console.log('[send-email] profiles fetched:', profiles?.length ?? 0, 'error:', profError)

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
    if (invoice?.invoice_type === 'final') {
      const { data: dep } = await supabase.from('invoices')
        .select('amount').eq('estimate_id', estimateId).eq('invoice_type', 'deposit').maybeSingle()
      depositInvForEmail = dep
    }
  }

  const [, taxLabel] = TAX_RATES[est.client_province || 'AB'] || [0.05, 'Tax']
  const companyName = await getCompanyName(supabase, est.user_id)
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
            <div style="${slbl}">${depositInvForEmail ? 'Balance Due' : 'Amount Due'}</div>
            <div style="font-size:32px;font-weight:800;color:#2563EB;line-height:1;margin-bottom:${depositInvForEmail ? 12 : 6}px;font-family:Arial,sans-serif">${fmtCAD(invoice.amount)}</div>
            ${depositInvForEmail ? `
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:12px;color:#94A3B8;padding:5px 0;border-bottom:1px solid #EEF0F4;font-family:Arial,sans-serif">Project total</td>
                <td style="font-size:12px;font-weight:600;color:#475467;padding:5px 0;border-bottom:1px solid #EEF0F4;text-align:right;font-family:Arial,sans-serif">${fmtCAD(est.total)}</td>
              </tr>
              <tr>
                <td style="font-size:12px;color:#94A3B8;padding:5px 0;font-family:Arial,sans-serif">Deposit paid</td>
                <td style="font-size:12px;font-weight:600;color:#059669;padding:5px 0;text-align:right;font-family:Arial,sans-serif">&minus;${fmtCAD(depositInvForEmail.amount)}</td>
              </tr>
            </table>
            ` : `<div style="font-size:12px;color:#94A3B8;font-family:Arial,sans-serif">${dueDateFmt ? `Due ${dueDateFmt} &middot; ` : ''}Net 14</div>`}
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
    const depositOnSigning = Math.round(est.total * depositPct) / 100
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

  // ── REMINDER ─────────────────────────────────────────────────────────────────
  } else if (type === 'reminder') {
    if (est.last_reminder_sent_at) {
      const hoursSince = (Date.now() - new Date(est.last_reminder_sent_at).getTime()) / 3600000
      if (hoursSince < 24) {
        return NextResponse.json({ error: 'Reminder already sent recently' }, { status: 429 })
      }
    }
    subject = `Following up on your estimate, ${est.client_name || 'Client'}`
    const remSettings = (prof as any)?.quote_settings?.reminders
    const remCount: number = est.reminder_count ?? 0
    const rawTemplate: string =
      (remCount <= 1 ? remSettings?.template_1 : remSettings?.template_2) || customMessage || ''
    const expiryFmt = est.valid_until
      ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(est.valid_until + 'T00:00:00'))
      : ''
    const amtFmt = typeof est.total === 'number'
      ? `CA$${est.total.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : ''
    const resolvedMessage = rawTemplate
      .replace(/\{client_name\}/g, est.client_name || '')
      .replace(/\{address\}/g, est.client_address || '')
      .replace(/\{amount\}/g, amtFmt)
      .replace(/\{expiry_date\}/g, expiryFmt)
      .replace(/\{estimate_number\}/g, est.estimate_number || '')
    const msgLines = (resolvedMessage).split('\n')
    const msgHtml = msgLines.map((line: string) =>
      `<p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 8px;font-family:Arial,sans-serif">${line || '&nbsp;'}</p>`
    ).join('')
    html = outerWrap(`
${hdrBlock('Following up', est.client_name || 'Client',
  pill(est.estimate_number) + pill('Reminder')
)}
      <!-- BODY -->
      <tr><td style="${bodyStyle}">

        <!-- Message -->
        <table width="100%" cellpadding="0" cellspacing="0" style="${cardBase}">
          <tr><td style="padding:20px">
            ${msgHtml}
          </td></tr>
        </table>

        <!-- CTA -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px">
          <tr><td align="center" style="padding:8px 0">
            <a href="${clientLink}" style="background:#2563EB;color:#ffffff;text-decoration:none;border-radius:12px;padding:14px 32px;font-size:14px;font-weight:700;font-family:Arial,sans-serif;display:inline-block">View Estimate &rarr;</a>
          </td></tr>
        </table>

        <p style="font-size:12px;color:#9CA3AF;text-align:center;margin:8px 0 0;font-family:Arial,sans-serif">Questions? Contact ${companyName}${(prof as any)?.phone ? ` at ${(prof as any).phone}` : ''}</p>

      </td></tr>
`)

  // ── SEND (estimate to client) ─────────────────────────────────────────────────
  } else if (type === 'send') {
    subject = `Your estimate from ${companyName} — ${est.estimate_number}`
    const projectAddress = [est.client_address, est.client_city].filter(Boolean).join(', ')
    const validUntilDate = new Date(new Date(est.created_at).getTime() + 30 * 24 * 60 * 60 * 1000)
    const validUntilFmt = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(validUntilDate)
    const estimateUrl = `https://useapexscale.com/estimate/${est.id}`
    const sendLogoHtml = (prof as any)?.logo_url
      ? `<img src="${(prof as any).logo_url}" style="height:30px;max-width:160px;display:block;object-fit:contain;" alt="${companyName}" />`
      : `<div style="display:flex;align-items:center;gap:8px;"><div style="width:30px;height:30px;border-radius:7px;background:linear-gradient(135deg,#1a3a7c,#2563EB);color:#fff;font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center;">${companyName.charAt(0).toUpperCase()}</div><span style="font-size:14px;font-weight:800;color:#0B1220;">${companyName}</span></div>`
    const estimateIntro = projectAddress
      ? `We've prepared a custom estimate for your project at <b style="color:#0B1220;">${projectAddress}</b>. Take a look whenever you're ready.`
      : `We've prepared a custom estimate for you. Take a look whenever you're ready.`
    const estimateContactFooter = (prof as any)?.phone
      ? `Questions? Contact <b style="color:#475467;">${companyName}</b> &middot; ${(prof as any).phone}`
      : `Questions? Contact <b style="color:#475467;">${companyName}</b>`

    html = `<div style="font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 10px rgba(15,23,42,0.06);">
  <div style="padding:22px 40px 18px;display:flex;justify-content:space-between;align-items:center;">
    ${sendLogoHtml}
    <span style="background:#EEF3FF;color:#2563EB;font-size:12px;font-weight:800;padding:6px 14px;border-radius:99px;">${est.estimate_number}</span>
  </div>
  <div style="height:1px;background:rgba(15,23,42,0.07);margin:0 40px;"></div>
  <div style="padding:24px 40px 8px;">
    <div style="font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#94A0B4;margin-bottom:10px;">Prepared for ${est.client_name || 'you'}</div>
    <h1 style="font-size:29px;font-weight:800;color:#0B1220;letter-spacing:-0.02em;line-height:1.1;margin:0 0 14px;">Your estimate is ready.</h1>
    <p style="font-size:15px;line-height:1.6;color:#475467;margin:0 0 24px;">${estimateIntro}</p>
    <div style="border-left:3px solid #2563EB;padding:2px 0 2px 18px;margin:0 0 26px;">
      <div style="display:flex;justify-content:space-between;padding:8px 0;"><span style="font-size:14px;font-weight:700;color:#94A0B4;">Estimate total</span><span style="font-size:15px;font-weight:800;color:#2563EB;">${fmtCAD(est.total)}</span></div>
      <div style="height:1px;background:rgba(15,23,42,0.07);"></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;"><span style="font-size:14px;font-weight:700;color:#94A0B4;">Valid until</span><span style="font-size:14px;font-weight:800;color:#0B1220;">${validUntilFmt}</span></div>
    </div>
    <a href="${estimateUrl}" style="display:block;background:#3B5BF5;color:#fff;text-decoration:none;text-align:center;font-size:16px;font-weight:800;padding:17px;border-radius:14px;">View estimate &#8594;</a>
  </div>
  <div style="text-align:center;font-size:13.5px;color:#94A0B4;padding:18px 40px 22px;line-height:1.5;">${estimateContactFooter}</div>
  <div style="padding:16px 40px 24px;text-align:center;border-top:1px solid rgba(15,23,42,0.06);font-size:12px;color:#94A0B4;">Powered by <b style="color:#475467;">ApexScale</b></div>
</div>`
  }

  // ── DEPOSIT RECEIPT ──────────────────────────────────────────────────────────
  if (type === 'deposit_receipt' && invoice) {
    const amountPaid = invoice.amount
    const balance = Math.max(0, (est.total || 0) - amountPaid)
    const paidDateFmt = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
      .format(invoice.paid_at ? new Date(invoice.paid_at) : new Date())

    subject = `Payment received — ${invoice.invoice_number}`
    html = outerWrap(`
${hdrBlock('Payment received for', est.client_name || 'Client',
  greenPill('&#10003; Received') + pill(invoice.invoice_number) + pill(paidDateFmt)
)}
      <!-- BODY -->
      <tr><td style="${bodyStyle}">

        <!-- Amount Received -->
        <table width="100%" cellpadding="0" cellspacing="0" style="${cardBase};border:1.5px solid #BBF7D0">
          <tr><td style="padding:16px">
            <div style="${slbl}">Amount Received</div>
            <div style="font-size:32px;font-weight:800;color:#059669;line-height:1;margin-bottom:6px;font-family:Arial,sans-serif">${fmtCAD(amountPaid)}</div>
            <div style="font-size:12px;color:#94A3B8;font-family:Arial,sans-serif">Received ${paidDateFmt}</div>
          </td></tr>
        </table>

        <!-- Payment Details -->
        <table width="100%" cellpadding="0" cellspacing="0" style="${cardBase}">
          <tr><td style="padding:16px">
            <div style="${slbl}">Payment Details</div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="${dkeyStyle}">Invoice</td>
                <td style="${dvalStyle}">${invoice.invoice_number}</td>
              </tr>
              <tr>
                <td style="${dkeyStyle}">Related estimate</td>
                <td style="${dvalStyle}">${est.estimate_number}</td>
              </tr>
              <tr>
                <td style="${dkeyStyle.replace('border-bottom:1px solid #EEF0F4', 'border-bottom:none')}">Balance remaining</td>
                <td style="${dvalStyle.replace('color:#0A1628', balance > 0 ? 'color:#2563EB' : 'color:#059669').replace('border-bottom:1px solid #EEF0F4', 'border-bottom:none')}">${balance > 0 ? fmtCAD(balance) : 'Paid in full'}</td>
              </tr>
            </table>
          </td></tr>
        </table>

        <!-- Message -->
        <table width="100%" cellpadding="0" cellspacing="0" style="${cardBase}">
          <tr><td style="padding:16px;font-size:13px;color:#64748B;line-height:1.7;font-family:Arial,sans-serif">
            Thank you for your payment${est.client_name ? `, <strong style="color:#0A1628">${est.client_name}</strong>` : ''}. ${balance > 0 ? `The remaining balance of <strong style="color:#0A1628">${fmtCAD(balance)}</strong> will be due upon completion.` : 'Your account is fully paid. We appreciate your business!'}
          </td></tr>
        </table>

        <!-- CTA -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px">
          <tr><td align="center" style="padding:8px 0">
            <a href="${clientLink}" style="background:#059669;color:#ffffff;text-decoration:none;border-radius:12px;padding:14px 32px;font-size:14px;font-weight:700;font-family:Arial,sans-serif;display:inline-block">View Estimate &rarr;</a>
          </td></tr>
        </table>

        <p style="font-size:12px;color:#9CA3AF;text-align:center;margin:8px 0 0;font-family:Arial,sans-serif">Questions? Contact ${companyName}${prof?.phone ? ` at ${prof.phone}` : ''}</p>

      </td></tr>
`)
  }

  // ── FINAL RECEIPT ────────────────────────────────────────────────────────────
  if (type === 'final_receipt' && invoice) {
    const amountPaid = invoice.amount
    const paidDateFmt = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
      .format(invoice.paid_at ? new Date(invoice.paid_at) : new Date())

    subject = `Payment complete — ${est.estimate_number}`
    html = outerWrap(`
${hdrBlock('Payment complete for', est.client_name || 'Client',
  greenPill('&#10003; Paid in full') + pill(invoice.invoice_number) + pill(paidDateFmt)
)}
      <!-- BODY -->
      <tr><td style="${bodyStyle}">

        <!-- Amount Received -->
        <table width="100%" cellpadding="0" cellspacing="0" style="${cardBase};border:1.5px solid #BBF7D0">
          <tr><td style="padding:16px">
            <div style="${slbl}">Final Payment Received</div>
            <div style="font-size:32px;font-weight:800;color:#059669;line-height:1;margin-bottom:6px;font-family:Arial,sans-serif">${fmtCAD(amountPaid)}</div>
            <div style="font-size:12px;color:#94A3B8;font-family:Arial,sans-serif">Received ${paidDateFmt}</div>
          </td></tr>
        </table>

        <!-- Project Complete -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#ECFDF5;border:1.5px solid #BBF7D0;border-radius:16px;margin-bottom:10px">
          <tr><td style="padding:20px;text-align:center">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 12px">
              <tr><td width="40" height="40" style="width:40px;height:40px;background:#059669;border-radius:20px;text-align:center;vertical-align:middle">
                <span style="color:#ffffff;font-size:20px;font-weight:700;font-family:Arial,sans-serif;line-height:40px;display:block">&#10003;</span>
              </td></tr>
            </table>
            <div style="font-size:15px;font-weight:700;color:#065F46;margin-bottom:4px;font-family:Arial,sans-serif">Your project is now complete</div>
            <div style="font-size:13px;color:#34D399;font-family:Arial,sans-serif">Thank you for choosing ${companyName}</div>
          </td></tr>
        </table>

        <!-- Payment Details -->
        <table width="100%" cellpadding="0" cellspacing="0" style="${cardBase}">
          <tr><td style="padding:16px">
            <div style="${slbl}">Payment Details</div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="${dkeyStyle}">Invoice</td>
                <td style="${dvalStyle}">${invoice.invoice_number}</td>
              </tr>
              <tr>
                <td style="${dkeyStyle.replace('border-bottom:1px solid #EEF0F4', 'border-bottom:none')}">Related estimate</td>
                <td style="${dvalStyle.replace('border-bottom:1px solid #EEF0F4', 'border-bottom:none')}">${est.estimate_number}</td>
              </tr>
            </table>
          </td></tr>
        </table>

        <!-- Message -->
        <table width="100%" cellpadding="0" cellspacing="0" style="${cardBase}">
          <tr><td style="padding:16px;font-size:13px;color:#64748B;line-height:1.7;font-family:Arial,sans-serif">
            Thank you${est.client_name ? `, <strong style="color:#0A1628">${est.client_name}</strong>` : ''}! Your final payment of <strong style="color:#0A1628">${fmtCAD(amountPaid)}</strong> has been received. It was a pleasure working with you — we appreciate your business!
          </td></tr>
        </table>

        <!-- CTA -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px">
          <tr><td align="center" style="padding:8px 0">
            <a href="${clientLink}" style="background:#059669;color:#ffffff;text-decoration:none;border-radius:12px;padding:14px 32px;font-size:14px;font-weight:700;font-family:Arial,sans-serif;display:inline-block">View Estimate &rarr;</a>
          </td></tr>
        </table>

        <p style="font-size:12px;color:#9CA3AF;text-align:center;margin:8px 0 0;font-family:Arial,sans-serif">Questions? Contact ${companyName}${prof?.phone ? ` at ${prof.phone}` : ''}</p>

      </td></tr>
`)
  }

  const replyTo = (prof as any)?.company_contact_email || (prof as any)?.interac_email || undefined
  const emailPayload: any = {
    from: `${companyName} <noreply@useapexscale.com>`,
    to: [est.client_email],
    subject,
    html,
    ...(replyTo ? { reply_to: replyTo } : {}),
    ...(type === 'send' && estimateId ? {
      tags: [{ name: 'estimate_id', value: estimateId }],
      open_tracking: true,
    } : {}),
  }
  try {
    const { data, error } = await resend.emails.send(emailPayload)
    if (error) {
      console.error('RESEND ERROR:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    try {
      if (type === 'send') {
        await logActivity(supabase, { user_id: est.user_id, event_type: 'estimate_sent', actor_type: 'contractor', entity_type: 'estimate', entity_id: estimateId, entity_number: est.estimate_number, client_name: est.client_name, amount: est.total })
      }
    } catch (logErr) {
      console.error('[send-email] logActivity error:', logErr)
    }
    return NextResponse.json({ success: true, id: data?.id, sentTo: est.client_email, subject })
  } catch (e: any) {
    console.error('RESEND EXCEPTION:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
