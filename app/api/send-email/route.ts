import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { TAX_RATES, fmtCAD } from '@/lib/pricing'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const { estimateId, type } = await request.json()
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
    subject = `✅ Signed! ${est.estimate_number} — ${fmtCAD(est.total)}`
    html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#F5F5F5">
<div style="max-width:500px;margin:0 auto;padding:24px 16px">
  <div style="background:linear-gradient(135deg,#1A1A1A,#353A3E);border-radius:16px 16px 0 0;padding:28px 24px;text-align:center">
    <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-.02em">Estimate<span style="color:#D97706">OS</span></div>
    <div style="font-size:32px;margin:16px 0">✅</div>
    <div style="font-size:20px;font-weight:800;color:#fff">Estimate Signed!</div>
    <div style="font-size:13px;color:rgba(255,255,255,.6);margin-top:6px">${est.estimate_number}</div>
  </div>
  <div style="background:#fff;border-radius:0 0 16px 16px;padding:24px">
    <p style="font-size:14px;color:#1A1A1A;margin-bottom:16px">Hi ${est.client_name || 'there'},</p>
    <p style="font-size:13px;color:#6b7280;line-height:1.6;margin-bottom:20px">
      Thank you for approving <strong>${est.estimate_number}</strong> from <strong>${companyName}</strong>. Your estimate is confirmed!
    </p>
    <div style="background:#F5F5F5;border-radius:12px;padding:16px;margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:6px">
        <span>Tier</span><span style="font-weight:700;color:#1A1A1A">${(est.tier || 'better').charAt(0).toUpperCase() + (est.tier || 'better').slice(1)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:6px">
        <span>Subtotal</span><span>${fmtCAD(est.subtotal)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:10px">
        <span>${taxLabel}</span><span>${fmtCAD(est.tax_amount)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:800;color:#D97706;border-top:1px solid #E0E0E0;padding-top:10px">
        <span style="color:#1A1A1A;font-size:13px;font-weight:600">Total</span><span>${fmtCAD(est.total)}</span>
      </div>
    </div>
    <p style="font-size:12px;color:#6b7280;line-height:1.6;margin-bottom:20px">
      <strong>${companyName}</strong> will contact you shortly to schedule the work and collect the deposit.
    </p>
    <div style="text-align:center">
      <a href="${clientLink}" style="background:linear-gradient(135deg,#b45309,#D97706);color:#fff;text-decoration:none;border-radius:10px;padding:12px 24px;font-size:13px;font-weight:700;display:inline-block">
        View Your Estimate →
      </a>
    </div>
  </div>
  <p style="text-align:center;font-size:10px;color:#BFBFBF;margin-top:16px">
    Sent via EstimateOS · ${companyName}${prof?.phone ? ` · ${prof.phone}` : ''}
  </p>
</div>
</body>
</html>`
  } else if (type === 'send') {
    subject = `Your estimate from ${companyName} — ${est.estimate_number}`
    html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#F5F5F5">
<div style="max-width:500px;margin:0 auto;padding:24px 16px">
  <div style="background:linear-gradient(135deg,#1A1A1A,#353A3E);border-radius:16px 16px 0 0;padding:28px 24px">
    <div style="font-size:20px;font-weight:800;color:#fff">Estimate<span style="color:#D97706">OS</span></div>
    <div style="font-size:24px;font-weight:800;color:#fff;margin-top:12px">Your estimate is ready</div>
    <div style="font-size:13px;color:rgba(255,255,255,.6);margin-top:4px">${est.estimate_number} from ${companyName}</div>
  </div>
  <div style="background:#fff;border-radius:0 0 16px 16px;padding:24px">
    <p style="font-size:14px;color:#1A1A1A;margin-bottom:16px">Hi ${est.client_name || 'there'},</p>
    <p style="font-size:13px;color:#6b7280;line-height:1.6;margin-bottom:20px">
      <strong>${companyName}</strong> has prepared an estimate for your project. Review the options below and sign online — it takes less than a minute.
    </p>
    <div style="background:#FEF3C7;border:1px solid #FCD34D;border-radius:10px;padding:14px;margin-bottom:20px;text-align:center">
      <div style="font-size:11px;color:#92400E;font-weight:700;margin-bottom:4px">ESTIMATE TOTAL (Better Package)</div>
      <div style="font-size:28px;font-weight:800;color:#D97706">${fmtCAD(est.total)}</div>
      <div style="font-size:11px;color:#92400E">inc. ${taxLabel} · Valid until ${est.valid_until || '30 days'}</div>
    </div>
    <div style="text-align:center;margin-bottom:20px">
      <a href="${clientLink}" style="background:linear-gradient(135deg,#b45309,#D97706);color:#fff;text-decoration:none;border-radius:10px;padding:14px 28px;font-size:14px;font-weight:700;display:inline-block">
        View &amp; Sign Estimate →
      </a>
    </div>
    <p style="font-size:11px;color:#BFBFBF;line-height:1.6">
      You can also choose from Good, Better, or Best packages. This estimate expires on ${est.valid_until || '30 days from now'}.
    </p>
  </div>
  <p style="text-align:center;font-size:10px;color:#BFBFBF;margin-top:16px">
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
