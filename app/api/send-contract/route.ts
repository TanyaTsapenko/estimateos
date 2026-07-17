import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { getTeamUserIds } from '@/lib/teamScope'
import { logActivity } from '@/lib/activity'
import { emailRateLimit } from '@/lib/rateLimit'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
  const { success } = await emailRateLimit.limit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { contractId, estimateId, clientEmail, clientName, companyName } = await req.json()

  if (!clientEmail) return NextResponse.json({ error: 'No client email' }, { status: 400 })

  if (!contractId) return NextResponse.json({ error: 'Missing contractId' }, { status: 400 })
  const safeCompany = (companyName || '').replace(/[<>"&]/g, c => ({'<':'&lt;','>':'&gt;','"':'&quot;','&':'&amp;'}[c]!))
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://useapexscale.com'
  const signUrl = `${appUrl}/sign/contract/${contractId}`
  const fmt = (n: number) => 'CA$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const contractBadge = 'CON-' + (contractId as string).slice(0, 6).toUpperCase()

  const svc = createServiceClient()
  let est: any = null
  let prof: any = null

  if (estimateId) {
    const { data: e } = await svc.from('estimates')
      .select('client_name, client_address, client_city, total, user_id, deposit_percent, estimate_number')
      .eq('id', estimateId).single()
    est = e
    if (est) {
      const { userIds } = await getTeamUserIds(svc, user.id)
      if (!userIds.includes(est.user_id as string)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    if (est?.user_id) {
      const { data: p } = await svc.from('profiles')
        .select('logo_url, phone, deposit_percent, company_contact_email, interac_email')
        .eq('id', est.user_id).single()
      prof = p
    }
  }

  const contractReplyTo = prof?.company_contact_email || prof?.interac_email || undefined
  const depositPct = est?.deposit_percent ?? prof?.deposit_percent ?? 30
  const projectAddress = [est?.client_address, est?.client_city].filter(Boolean).join(', ')
  const totalFmt = est?.total != null ? fmt(est.total) : null
  const depositFmt = est?.total != null ? fmt(est.total * depositPct / 100) : null

  const logoHtml = prof?.logo_url
    ? `<img src="${prof.logo_url}" style="height:30px;max-width:160px;display:block;object-fit:contain;" alt="${safeCompany}" />`
    : `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="vertical-align:middle;padding-right:8px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="30" height="30" style="width:30px;height:30px;border-radius:7px;background:linear-gradient(135deg,#1a3a7c,#2563EB);color:#fff;font-weight:800;font-size:14px;text-align:center;line-height:30px;vertical-align:middle;">${safeCompany.charAt(0).toUpperCase() || 'A'}</td></tr></table></td><td style="vertical-align:middle;"><span style="font-size:14px;font-weight:800;color:#0B1220;">${safeCompany}</span></td></tr></table>`

  const introPara = projectAddress
    ? `Review the details for your project at <b style="color:#0B1220;">${projectAddress}</b> and sign online in a couple of taps. Once signed, you'll receive a copy and deposit instructions by email.`
    : `Review the details and sign online in a couple of taps. Once signed, you'll receive a copy and deposit instructions by email.`

  const totalsBlock = totalFmt
    ? `<div style="background:#F4F7FE;border:1px solid rgba(37,99,235,0.14);border-radius:12px;padding:16px 18px;margin:0 0 26px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="font-size:13.5px;color:#475467;padding:5px 0;">Project total</td><td align="right" style="font-size:13.5px;font-weight:700;color:#0B1220;padding:5px 0;white-space:nowrap;">${totalFmt}</td></tr>
        ${depositFmt ? `<tr><td style="font-size:14px;font-weight:700;color:#475467;padding:9px 0 5px;border-top:1px solid rgba(37,99,235,0.12);">Deposit due on signing</td><td align="right" style="font-size:16px;font-weight:800;color:#1D4ED8;padding:9px 0 5px;border-top:1px solid rgba(37,99,235,0.12);white-space:nowrap;">${depositFmt}</td></tr>` : ''}
      </table>
    </div>`
    : ''

  const phoneFooter = prof?.phone
    ? `Questions before signing?<br>Contact <b style="color:#475467;">${safeCompany}</b> &middot; ${prof.phone}`
    : `Questions before signing? Contact <b style="color:#475467;">${safeCompany}</b>`

  const emailHtml = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#EAECF2" style="background:#EAECF2;"><tr><td align="center" style="padding:32px 16px;">
<div style="font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;width:100%;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 10px rgba(15,23,42,0.06);">
  <div style="padding:22px 40px 18px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td align="left" style="vertical-align:middle;">${logoHtml}</td>
      <td align="right" style="vertical-align:middle;white-space:nowrap;"><span style="background:#EEF3FF;color:#2563EB;font-size:12px;font-weight:800;padding:6px 14px;border-radius:99px;">${contractBadge}</span></td>
    </tr></table>
  </div>
  <div style="height:1px;background:rgba(15,23,42,0.07);margin:0 40px;"></div>
  <div style="padding:24px 40px 8px;">
    <h1 style="font-size:29px;font-weight:800;color:#0B1220;letter-spacing:-0.02em;line-height:1.1;margin:0 0 14px;">Your contract is ready to sign.</h1>
    <p style="font-size:15px;line-height:1.6;color:#475467;margin:0 0 24px;">${introPara}</p>
    ${totalsBlock}
    <a href="${signUrl}" style="display:block;background:#3B5BF5;color:#fff;text-decoration:none;text-align:center;font-size:16px;font-weight:800;padding:17px;border-radius:14px;">Review &amp; sign contract &#8594;</a>
  </div>
  <div style="text-align:center;font-size:13.5px;color:#94A0B4;padding:18px 40px 22px;line-height:1.5;">${phoneFooter}</div>
  <div style="padding:16px 40px 24px;text-align:center;border-top:1px solid rgba(15,23,42,0.06);font-size:12px;color:#94A0B4;">Powered by <b style="color:#475467;">ApexScale</b></div>
</div>
</td></tr></table>`

  try {
    const emailOpts: any = {
      from: `${companyName} <noreply@useapexscale.com>`,
      to: clientEmail,
      subject: `Contract from ${companyName} — Ready to Sign`,
      ...(contractReplyTo ? { reply_to: contractReplyTo } : {}),
      open_tracking: true,
      tags: [{ name: 'contract_id', value: contractId }],
      html: emailHtml,
    }
    await resend.emails.send(emailOpts)
    if (est?.user_id) {
      try {
        await logActivity(svc, {
          user_id: est.user_id,
          event_type: 'contract_sent',
          actor_type: 'contractor',
          entity_type: 'estimate',
          entity_id: estimateId,
          entity_number: est.estimate_number,
          client_name: est.client_name,
          amount: est.total,
        })
      } catch (logErr) {
        console.error('[send-contract] logActivity error:', logErr)
      }
    }
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
