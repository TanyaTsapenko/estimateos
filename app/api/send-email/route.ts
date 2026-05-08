import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { TAX_RATES, fmtCAD } from '@/lib/pricing'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const { estimateId, type, sendMode } = await request.json()
  if (!estimateId) return NextResponse.json({ error: 'Missing estimateId' }, { status: 400 })

  const supabase = await createClient()
  const { data: est } = await supabase.from('estimates').select('*').eq('id', estimateId).single()
  if (!est || !est.client_email) return NextResponse.json({ error: 'No email' }, { status: 400 })

  const { data: prof } = await supabase.from('profiles')
    .select('company_name, phone, city, province').eq('id', est.user_id).single()

  const [, taxLabel] = TAX_RATES[est.client_province || 'AB'] || [0.05, 'Tax']
  const companyName = prof?.company_name || 'Your contractor'
  const clientLink = `${request.nextUrl.origin}/estimate/${estimateId}`

  let subject = ''
  let html = ''

  if (type === 'signed') {
    subject = `Signed — ${est.estimate_number} · ${fmtCAD(est.total)}`
    html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#E8E9EC">
<div style="max-width:520px;margin:0 auto;padding:28px 16px">

  <div style="background:linear-gradient(135deg,#0A0E1A 0%,#0D1630 50%,#1A2744 100%);border-radius:16px 16px 0 0;padding:32px 28px">
    <div style="font-size:18px;font-weight:800;color:#fff;letter-spacing:-.01em;margin-bottom:20px">Estimate<span style="color:#3B6CFF">OS</span></div>
    <div style="font-size:22px;font-weight:800;color:#fff;margin-bottom:4px">Estimate confirmed</div>
    <div style="font-size:13px;color:rgba(255,255,255,.5)">${est.estimate_number} · ${companyName}</div>
  </div>

  <div style="background:#fff;border-radius:0 0 16px 16px;padding:28px">
    <p style="font-size:14px;color:#1A1A1A;font-weight:600;margin:0 0 8px">Hi ${est.client_name || 'there'},</p>
    <p style="font-size:13px;color:#6b7280;line-height:1.7;margin:0 0 24px">
      Thank you for signing <strong style="color:#1A1A1A">${est.estimate_number}</strong>. Your project with <strong style="color:#1A1A1A">${companyName}</strong> is confirmed and ready to move forward.
    </p>

    <div style="background:#F4F5F7;border:1.5px solid #1A2744;border-radius:12px;padding:18px;margin-bottom:24px">
      <div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#2045B8;margin-bottom:12px">Project Summary</div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:6px">
        <span>${(est.tier || 'better').charAt(0).toUpperCase() + (est.tier || 'better').slice(1)} Package</span>
        <span style="color:#1A1A1A;font-weight:600">${fmtCAD(est.subtotal)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:12px">
        <span>${taxLabel}</span>
        <span style="color:#1A1A1A;font-weight:600">${fmtCAD(est.tax_amount)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;border-top:1.5px solid #1A2744;padding-top:12px">
        <span style="font-size:13px;font-weight:700;color:#1A1A1A">Total</span>
        <span style="font-size:24px;font-weight:800;color:#2045B8">${fmtCAD(est.total)}</span>
      </div>
    </div>

    <p style="font-size:12px;color:#6b7280;line-height:1.7;margin:0 0 24px">
      ${companyName} will be in touch shortly to schedule the work and arrange the deposit.
    </p>

    <div style="text-align:center">
      <a href="${clientLink}" style="background:#3B6CFF;color:#fff;text-decoration:none;border-radius:10px;padding:13px 28px;font-size:13px;font-weight:700;display:inline-block">
        View Signed Estimate →
      </a>
    </div>
  </div>

  <p style="text-align:center;font-size:10px;color:#9ca3af;margin-top:16px">
    Sent via EstimateOS · ${companyName}${prof?.phone ? ` · ${prof.phone}` : ''}
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
      ? `<strong style="color:#1A1A1A">${companyName}</strong> has sent you a contract to review and sign.`
      : isEstimateContract
        ? `<strong style="color:#1A1A1A">${companyName}</strong> has sent you an estimate and contract. Please review the contract first, then review the estimate and sign.`
        : `<strong style="color:#1A1A1A">${companyName}</strong> has prepared an estimate for your project. Review the details and sign online — it takes less than a minute.`
    const btnText = isContractOnly ? 'Review &amp; Sign Contract →' : isEstimateContract ? 'View Contract &amp; Estimate →' : 'View &amp; Sign Estimate →'
    html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#E8E9EC">
<div style="max-width:520px;margin:0 auto;padding:28px 16px">

  <div style="background:linear-gradient(135deg,#0A0E1A 0%,#0D1630 50%,#1A2744 100%);border-radius:16px 16px 0 0;padding:32px 28px">
    <div style="font-size:18px;font-weight:800;color:#fff;letter-spacing:-.01em;margin-bottom:20px">Estimate<span style="color:#3B6CFF">OS</span></div>
    <div style="font-size:22px;font-weight:800;color:#fff;margin-bottom:4px">${headerTitle}</div>
    <div style="font-size:13px;color:rgba(255,255,255,.5)">${est.estimate_number} · ${companyName}</div>
  </div>

  <div style="background:#fff;border-radius:0 0 16px 16px;padding:28px">
    <p style="font-size:14px;color:#1A1A1A;font-weight:600;margin:0 0 8px">Hi ${est.client_name || 'there'},</p>
    <p style="font-size:13px;color:#6b7280;line-height:1.7;margin:0 0 24px">
      ${bodyText}
    </p>

    ${!isContractOnly ? `<div style="background:#F4F5F7;border:1.5px solid #1A2744;border-radius:12px;padding:18px;margin-bottom:24px;text-align:center">
      <div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#2045B8;margin-bottom:8px">${(est.tier || 'better').toUpperCase()} PACKAGE</div>
      <div style="font-size:32px;font-weight:800;color:#2045B8;line-height:1">${fmtCAD(est.total)}</div>
      <div style="font-size:11px;color:#9ca3af;margin-top:6px">inc. ${taxLabel} · Valid until ${est.valid_until || '30 days'}</div>
    </div>` : ''}

    <div style="text-align:center;margin-bottom:24px">
      <a href="${clientLink}" style="background:#3B6CFF;color:#fff;text-decoration:none;border-radius:10px;padding:14px 32px;font-size:14px;font-weight:700;display:inline-block">
        ${btnText}
      </a>
    </div>

    ${!isContractOnly ? `<p style="font-size:11px;color:#9ca3af;line-height:1.7;text-align:center">
      You can choose from Good, Better, or Best packages. Estimate expires ${est.valid_until || '30 days from now'}.
    </p>` : ''}
  </div>

  <p style="text-align:center;font-size:10px;color:#9ca3af;margin-top:16px">
    Sent via EstimateOS · ${companyName}
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
