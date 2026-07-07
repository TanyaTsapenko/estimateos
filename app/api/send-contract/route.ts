import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const { contractId, estimateId, clientEmail, clientName, companyName } = await req.json()

  if (!clientEmail) return NextResponse.json({ error: 'No client email' }, { status: 400 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://useapexscale.com'
  const signUrl = `${appUrl}/sign/contract/${contractId}`
  const fmt = (n: number) => 'CA$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const contractBadge = 'CON-' + contractId.slice(0, 6).toUpperCase()

  const svc = createServiceClient()
  let est: any = null
  let prof: any = null

  if (estimateId) {
    const { data: e } = await svc.from('estimates')
      .select('client_name, client_address, client_city, total, user_id')
      .eq('id', estimateId).single()
    est = e
    if (est?.user_id) {
      const { data: p } = await svc.from('profiles')
        .select('logo_url, phone, deposit_percent, company_contact_email, interac_email')
        .eq('id', est.user_id).single()
      prof = p
    }
  }

  const contractReplyTo = prof?.company_contact_email || prof?.interac_email || undefined
  const depositPct = prof?.deposit_percent ?? 30
  const projectAddress = [est?.client_address, est?.client_city].filter(Boolean).join(', ')
  const totalFmt = est?.total != null ? fmt(est.total) : null
  const depositFmt = est?.total != null ? fmt(est.total * depositPct / 100) : null

  const logoHtml = prof?.logo_url
    ? `<img src="${prof.logo_url}" style="height:30px;max-width:160px;display:block;object-fit:contain;" alt="${companyName}" />`
    : `<div style="display:flex;align-items:center;gap:8px;"><div style="width:30px;height:30px;border-radius:7px;background:linear-gradient(135deg,#1a3a7c,#2563EB);color:#fff;font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center;">${companyName.charAt(0).toUpperCase()}</div><span style="font-size:14px;font-weight:800;color:#0B1220;">${companyName}</span></div>`

  const introPara = projectAddress
    ? `Review the details for your project at <b style="color:#0B1220;">${projectAddress}</b> and sign online in a couple of taps. Once signed, you'll receive a copy and deposit instructions by email.`
    : `Review the details and sign online in a couple of taps. Once signed, you'll receive a copy and deposit instructions by email.`

  const depositRow = depositFmt
    ? `<div style="display:flex;justify-content:space-between;padding:5px 0;border-top:1px solid rgba(37,99,235,0.12);margin-top:4px;padding-top:9px;"><span style="font-size:14px;font-weight:800;color:#1D4ED8;">Deposit due on signing</span><span style="font-size:16px;font-weight:800;color:#1D4ED8;">${depositFmt}</span></div>`
    : ''

  const totalsBlock = totalFmt
    ? `<div style="background:#F4F7FE;border:1px solid rgba(37,99,235,0.14);border-radius:12px;padding:16px 18px;margin:0 0 26px;">
      <div style="display:flex;justify-content:space-between;padding:5px 0;"><span style="font-size:13.5px;color:#475467;">Project total</span><span style="font-size:13.5px;font-weight:700;color:#0B1220;">${totalFmt}</span></div>
      ${depositRow}
    </div>`
    : ''

  const phoneFooter = prof?.phone
    ? `Questions before signing?<br>Contact <b style="color:#475467;">${companyName}</b> &middot; ${prof.phone}`
    : `Questions before signing? Contact <b style="color:#475467;">${companyName}</b>`

  try {
    await resend.emails.send({
      from: `${companyName} <noreply@useapexscale.com>`,
      to: clientEmail,
      subject: `Contract from ${companyName} — Ready to Sign`,
      ...(contractReplyTo ? { reply_to: contractReplyTo } : {}),
      html: `<div style="font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 10px rgba(15,23,42,0.06);">
  <div style="padding:22px 40px 18px;display:flex;justify-content:space-between;align-items:center;">
    ${logoHtml}
    <span style="background:#EEF3FF;color:#2563EB;font-size:12px;font-weight:800;padding:6px 14px;border-radius:99px;">${contractBadge}</span>
  </div>
  <div style="height:1px;background:rgba(15,23,42,0.07);margin:0 40px;"></div>
  <div style="padding:24px 40px 8px;">
    <div style="font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#94A0B4;margin-bottom:10px;">Ready for your signature</div>
    <h1 style="font-size:29px;font-weight:800;color:#0B1220;letter-spacing:-0.02em;line-height:1.1;margin:0 0 14px;">Your contract is ready to sign.</h1>
    <p style="font-size:15px;line-height:1.6;color:#475467;margin:0 0 24px;">${introPara}</p>
    ${totalsBlock}
    <a href="${signUrl}" style="display:block;background:#3B5BF5;color:#fff;text-decoration:none;text-align:center;font-size:16px;font-weight:800;padding:17px;border-radius:14px;">Review &amp; sign contract &#8594;</a>
  </div>
  <div style="text-align:center;font-size:13.5px;color:#94A0B4;padding:18px 40px 22px;line-height:1.5;">${phoneFooter}</div>
  <div style="padding:16px 40px 24px;text-align:center;border-top:1px solid rgba(15,23,42,0.06);font-size:12px;color:#94A0B4;">Powered by <b style="color:#475467;">ApexScale</b></div>
</div>`,
    })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
