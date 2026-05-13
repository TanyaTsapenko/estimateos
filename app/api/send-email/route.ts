import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { TAX_RATES, fmtCAD, OPENING_TYPES } from '@/lib/pricing'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const { estimateId: rawEstimateId, invoiceId, type, sendMode } = await request.json()

  const supabase = await createClient()
  let estimateId = rawEstimateId
  let invoice: any = null
  let openings: any[] = []

  // For invoice type, fetch invoice first so we can derive estimateId if not provided
  if (type === 'invoice' && invoiceId) {
    const { data: inv } = await supabase.from('invoices').select('*').eq('id', invoiceId).single()
    invoice = inv
    if (!estimateId && inv) estimateId = inv.estimate_id
  }

  if (!estimateId) return NextResponse.json({ error: 'Missing estimateId' }, { status: 400 })

  const { data: est } = await supabase.from('estimates').select('*').eq('id', estimateId).single()
  if (!est || !est.client_email) return NextResponse.json({ error: 'No email' }, { status: 400 })

  const { data: prof } = await supabase.from('profiles')
    .select('company_name, phone, city, province, logo_url').eq('id', est.user_id).single()

  // For invoice type, fetch invoice (if not already fetched) and openings
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
    : `<span style="font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.01em;font-family:Arial,sans-serif">Estimate<span style="color:#3B82F6">OS</span></span>`

  let subject = ''
  let html = ''

  if (type === 'invoice' && invoice) {
    const dueDateFmt = invoice.due_date
      ? new Date(invoice.due_date + 'T00:00:00').toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
      : ''
    const issuedFmt = invoice.created_at
      ? new Date(invoice.created_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
      : new Date().toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
    const invoiceTypeLabel = invoice.invoice_type === 'final' ? 'Final Invoice' : invoice.invoice_type === 'deposit' ? 'Deposit Invoice' : 'Standard Invoice'
    const tierLabel = (est.tier || 'better').charAt(0).toUpperCase() + (est.tier || 'better').slice(1)

    subject = `Invoice ${invoice.invoice_number} · ${fmtCAD(invoice.amount)} due ${dueDateFmt}`

    const openingRows = openings.map(op => `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px">
        <tr>
          <td valign="top">
            <div style="font-size:13px;font-weight:600;color:#0A1628;font-family:Arial,sans-serif">${(OPENING_TYPES as any)[op.type]?.name || op.type}</div>
            <div style="font-size:11px;color:#94A3B8;margin-top:2px;font-family:Arial,sans-serif">Qty ${op.qty}${op.room ? ' &middot; ' + op.room : ''}${op.floor === 'second' ? ' &middot; 2nd floor' : op.floor === 'third' ? ' &middot; 3rd+ floor' : ''}</div>
          </td>
          <td align="right" valign="top" style="font-size:13px;font-weight:700;color:#0A1628;white-space:nowrap;font-family:Arial,sans-serif">${fmtCAD(op.total_cost)}</td>
        </tr>
      </table>`).join('')

    const discountRow = est.discount_amount > 0 ? `
      <tr>
        <td style="font-size:12px;color:#16a34a;padding:3px 0;font-family:Arial,sans-serif">Discount</td>
        <td align="right" style="font-size:12px;color:#16a34a;font-weight:600;padding:3px 0;font-family:Arial,sans-serif">-${fmtCAD(est.discount_amount)}</td>
      </tr>` : ''

    html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#E8E9EC">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">

  <!-- HEADER -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0A1628;border-radius:16px 16px 0 0">
    <tr><td style="padding:28px">

      <!-- Logo + Save PDF -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px">
        <tr>
          <td valign="middle">${logoHtml}</td>
          <td align="right">
            <a href="${clientLink}" style="background:#2563EB;color:#ffffff;text-decoration:none;border-radius:20px;padding:6px 16px;font-size:11px;font-weight:700;font-family:Arial,sans-serif;display:inline-block">Save PDF</a>
          </td>
        </tr>
      </table>

      <!-- INVOICE kicker -->
      <div style="font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#3B82F6;margin-bottom:6px;font-family:Arial,sans-serif">INVOICE</div>

      <!-- Number -->
      <div style="font-size:32px;font-weight:800;color:#ffffff;line-height:1;margin-bottom:18px;font-family:Arial,sans-serif">${invoice.invoice_number}</div>

      <!-- Status pills -->
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding-right:6px">
            <span style="background:#2563EB;color:#ffffff;border-radius:20px;padding:5px 13px;font-size:10px;font-weight:700;font-family:Arial,sans-serif;display:inline-block">Payment Due</span>
          </td>
          <td style="padding-right:6px">
            <span style="border:1px solid rgba(255,255,255,0.3);color:rgba(255,255,255,0.75);border-radius:20px;padding:5px 13px;font-size:10px;font-weight:600;font-family:Arial,sans-serif;display:inline-block">Due ${dueDateFmt}</span>
          </td>
          <td>
            <span style="border:1px solid rgba(255,255,255,0.3);color:rgba(255,255,255,0.75);border-radius:20px;padding:5px 13px;font-size:10px;font-weight:600;font-family:Arial,sans-serif;display:inline-block">${invoiceTypeLabel}</span>
          </td>
        </tr>
      </table>

    </td></tr>
  </table>

  <!-- BODY -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:0 0 16px 16px">
    <tr><td style="padding:24px">

      <!-- 1. Payment status banner -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;margin-bottom:16px">
        <tr><td style="padding:16px">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="40" valign="middle">
                <div style="width:32px;height:32px;background:#2563EB;border-radius:50%;text-align:center;font-size:16px;line-height:32px;color:#ffffff;font-family:Arial,sans-serif">&#9201;</div>
              </td>
              <td style="padding-left:12px" valign="middle">
                <div style="font-size:14px;font-weight:700;color:#1E40AF;font-family:Arial,sans-serif">Payment Pending</div>
                <div style="font-size:12px;color:#3B82F6;margin-top:3px;font-family:Arial,sans-serif">Due ${dueDateFmt} &middot; ${fmtCAD(invoice.amount)} outstanding</div>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>

      <!-- 2. Dates card -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8FAFC;border-radius:12px;margin-bottom:16px">
        <tr><td style="padding:16px">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="33%" valign="top">
                <div style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:5px;font-family:Arial,sans-serif">Issued</div>
                <div style="font-size:13px;font-weight:700;color:#0A1628;font-family:Arial,sans-serif">${issuedFmt}</div>
              </td>
              <td width="33%" valign="top">
                <div style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:5px;font-family:Arial,sans-serif">Due Date</div>
                <div style="font-size:13px;font-weight:700;color:#2563EB;font-family:Arial,sans-serif">${dueDateFmt}</div>
              </td>
              <td width="33%" valign="top">
                <div style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:5px;font-family:Arial,sans-serif">Terms</div>
                <div style="font-size:13px;font-weight:700;color:#0A1628;font-family:Arial,sans-serif">Net 14 days</div>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>

      <!-- 3. From / Bill To -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px">
        <tr>
          <td width="50%" valign="top" style="padding-right:10px">
            <div style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:8px;font-family:Arial,sans-serif">FROM</div>
            <div style="font-size:13px;font-weight:700;color:#0A1628;margin-bottom:3px;font-family:Arial,sans-serif">${companyName}</div>
            ${prof?.city ? `<div style="font-size:12px;color:#64748B;font-family:Arial,sans-serif">${prof.city}${prof?.province ? ', ' + prof.province : ''}</div>` : ''}
            ${prof?.phone ? `<div style="font-size:12px;color:#64748B;font-family:Arial,sans-serif">${prof.phone}</div>` : ''}
          </td>
          <td width="50%" valign="top" style="padding-left:10px">
            <div style="font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:8px;font-family:Arial,sans-serif">BILL TO</div>
            <div style="font-size:13px;font-weight:700;color:#0A1628;margin-bottom:3px;font-family:Arial,sans-serif">${est.client_name || ''}</div>
            ${est.client_address ? `<div style="font-size:12px;color:#64748B;font-family:Arial,sans-serif">${est.client_address}</div>` : ''}
            ${est.client_phone ? `<div style="font-size:12px;color:#64748B;font-family:Arial,sans-serif">${est.client_phone}</div>` : ''}
          </td>
        </tr>
      </table>

      <!-- 4. Related estimate row -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #EEF0F4;border-bottom:1px solid #EEF0F4;margin-bottom:16px">
        <tr>
          <td style="padding:12px 0;font-size:12px;color:#94A3B8;font-family:Arial,sans-serif">Related Estimate</td>
          <td align="right" style="padding:12px 0">
            <span style="background:#EFF6FF;color:#2563EB;border-radius:20px;padding:4px 13px;font-size:11px;font-weight:700;font-family:Arial,sans-serif;display:inline-block">${est.estimate_number}</span>
          </td>
        </tr>
      </table>

      <!-- 5. Services card -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8FAFC;border-radius:12px;margin-bottom:16px">
        <tr><td style="padding:16px">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px">
            <tr>
              <td>
                <div style="font-size:13px;font-weight:700;color:#0A1628;font-family:Arial,sans-serif">Services Rendered</div>
                <div style="font-size:11px;color:#94A3B8;margin-top:3px;font-family:Arial,sans-serif">${openings.length} item${openings.length !== 1 ? 's' : ''} &middot; ${tierLabel} package</div>
              </td>
            </tr>
          </table>
          ${openingRows}
        </td></tr>
      </table>

      <!-- 6. Totals -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px">
        <tr>
          <td></td>
          <td width="230">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:12px;color:#64748B;padding:3px 0;font-family:Arial,sans-serif">Subtotal</td>
                <td align="right" style="font-size:12px;color:#0A1628;font-weight:600;padding:3px 0;font-family:Arial,sans-serif">${fmtCAD(est.subtotal)}</td>
              </tr>
              ${discountRow}
              <tr>
                <td style="font-size:12px;color:#64748B;padding:3px 0;font-family:Arial,sans-serif">${taxLabel}</td>
                <td align="right" style="font-size:12px;color:#0A1628;font-weight:600;padding:3px 0;font-family:Arial,sans-serif">${fmtCAD(est.tax_amount)}</td>
              </tr>
              <tr>
                <td style="font-size:15px;font-weight:700;color:#0A1628;padding-top:10px;font-family:Arial,sans-serif">Total Due</td>
                <td align="right" style="font-size:22px;font-weight:800;color:#2563EB;padding-top:10px;white-space:nowrap;font-family:Arial,sans-serif">${fmtCAD(invoice.amount)}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- 7. Payment instructions -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px">
        <tr><td style="padding:18px">
          <div style="font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#1E40AF;margin-bottom:12px;font-family:Arial,sans-serif">Payment Instructions</div>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="font-size:12px;color:#3B82F6;padding:4px 0;font-family:Arial,sans-serif">Send e-transfer to</td>
              <td align="right" style="font-size:12px;font-weight:600;color:#1E40AF;padding:4px 0;font-family:Arial,sans-serif">${companyName}</td>
            </tr>
            <tr>
              <td style="font-size:12px;color:#3B82F6;padding:4px 0;font-family:Arial,sans-serif">Reference</td>
              <td align="right" style="font-size:12px;font-weight:600;color:#1E40AF;padding:4px 0;font-family:Arial,sans-serif">${invoice.invoice_number}</td>
            </tr>
            ${prof?.phone ? `<tr>
              <td style="font-size:12px;color:#3B82F6;padding:4px 0;font-family:Arial,sans-serif">Phone</td>
              <td align="right" style="font-size:12px;font-weight:600;color:#1E40AF;padding:4px 0;font-family:Arial,sans-serif">${prof.phone}</td>
            </tr>` : ''}
          </table>
        </td></tr>
      </table>

    </td></tr>
  </table>

  <!-- FOOTER -->
  <p style="text-align:center;font-size:10px;color:#9ca3af;margin-top:16px;font-family:Arial,sans-serif">
    ${companyName} &middot; Sent via EstimateOS
  </p>

</div>
</body>
</html>`

  } else if (type === 'signed') {
    subject = `Signed — ${est.estimate_number} · ${fmtCAD(est.total)}`
    html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#E8E9EC">
<div style="max-width:520px;margin:0 auto;padding:28px 16px">

  <div style="background:#0A1628;border-radius:16px 16px 0 0;padding:32px 28px">
    <div style="margin-bottom:20px">${logoHtml}</div>
    <div style="font-size:22px;font-weight:800;color:#fff;margin-bottom:4px">Estimate confirmed &#10003;</div>
    <div style="font-size:13px;color:rgba(255,255,255,.5)">${est.estimate_number} &middot; ${companyName}</div>
  </div>

  <div style="background:#fff;border-radius:0 0 16px 16px;padding:28px">
    <p style="font-size:14px;color:#0A1628;font-weight:600;margin:0 0 8px">Hi ${est.client_name || 'there'},</p>
    <p style="font-size:13px;color:#64748B;line-height:1.7;margin:0 0 24px">
      Thank you for signing <strong style="color:#0A1628">${est.estimate_number}</strong>. Your project with <strong style="color:#0A1628">${companyName}</strong> is confirmed.
    </p>

    <div style="background:#F0FDF4;border:1px solid rgba(5,150,105,.2);border-radius:12px;padding:18px;margin-bottom:24px;text-align:center">
      <div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#059669;margin-bottom:8px">${(est.tier || 'better').toUpperCase()} PACKAGE</div>
      <div style="font-size:32px;font-weight:800;color:#059669;line-height:1">${fmtCAD(est.total)}</div>
      <div style="font-size:11px;color:#94A3B8;margin-top:6px">inc. ${taxLabel}${est.signed_at ? ` &middot; Signed ${new Date(est.signed_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}</div>
    </div>

    <p style="font-size:13px;color:#64748B;line-height:1.7;margin:0 0 20px">
      Your project is confirmed. We'll be in touch shortly to schedule the work and arrange the deposit.
    </p>

    <p style="text-align:center;font-size:11px;color:#94A3B8;margin:0">
      Questions? Contact ${companyName}${prof?.phone ? ` at ${prof.phone}` : ''}
    </p>
  </div>

  <p style="text-align:center;font-size:10px;color:#9ca3af;margin-top:16px">
    Sent via EstimateOS &middot; ${companyName}
  </p>
</div>
</body>
</html>`
  } else if (type === 'send') {
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
        ? `<strong style="color:#0A1628">${companyName}</strong> has sent you an estimate and contract. Please review the contract first, then review the estimate and sign.`
        : `<strong style="color:#0A1628">${companyName}</strong> has prepared an estimate for your project. Review the details and sign online &mdash; it takes less than a minute.`
    const btnText = isContractOnly ? 'Review &amp; Sign Contract &rarr;' : isEstimateContract ? 'View Contract &amp; Estimate &rarr;' : 'View &amp; Sign Estimate &rarr;'
    html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#E8E9EC">
<div style="max-width:520px;margin:0 auto;padding:28px 16px">

  <div style="background:#0A1628;border-radius:16px 16px 0 0;padding:32px 28px">
    <div style="margin-bottom:20px">${logoHtml}</div>
    <div style="font-size:22px;font-weight:800;color:#fff;margin-bottom:4px">${headerTitle}</div>
    <div style="font-size:13px;color:rgba(255,255,255,.5)">${est.estimate_number} &middot; ${companyName}</div>
  </div>

  <div style="background:#fff;border-radius:0 0 16px 16px;padding:28px">
    <p style="font-size:14px;color:#0A1628;font-weight:600;margin:0 0 8px">Hi ${est.client_name || 'there'},</p>
    <p style="font-size:13px;color:#64748B;line-height:1.7;margin:0 0 24px">
      ${bodyText}
    </p>

    ${!isContractOnly ? `<div style="background:#F4F5F7;border-radius:12px;padding:18px;margin-bottom:20px;text-align:center">
      <div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#2563EB;margin-bottom:8px">${(est.tier || 'better').toUpperCase()} PACKAGE</div>
      <div style="font-size:32px;font-weight:800;color:#2045B8;line-height:1">${fmtCAD(est.total)}</div>
      <div style="font-size:12px;color:#94A3B8;margin-top:6px">inc. ${taxLabel} &middot; Valid until ${est.valid_until || '30 days'}</div>
    </div>` : ''}

    <div style="margin-bottom:16px">
      <a href="${clientLink}" style="background:#2563EB;color:#fff;text-decoration:none;border-radius:10px;padding:14px;font-size:15px;font-weight:700;display:block;text-align:center">
        ${btnText}
      </a>
    </div>

    ${!isContractOnly ? `<p style="font-size:11px;color:#94A3B8;line-height:1.7;text-align:center;margin:0 0 20px">
      You can choose from Good, Better, or Best packages. Estimate expires ${est.valid_until || '30 days from now'}.
    </p>` : ''}

    <p style="text-align:center;font-size:11px;color:#94A3B8;margin:0">
      Questions? Contact ${companyName}${prof?.phone ? ` at ${prof.phone}` : ''}
    </p>
  </div>

  <p style="text-align:center;font-size:10px;color:#9ca3af;margin-top:16px">
    Sent via EstimateOS &middot; ${companyName}
  </p>
</div>
</body>
</html>`
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
