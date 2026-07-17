import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

const fmtCA = (n: number) =>
  'CA$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export async function POST(req: Request) {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret || req.headers.get('x-internal-secret') !== secret)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clientEmail, clientName, companyName, companyPhone, companyEmail, contractId, total, logoUrl } = await req.json()

  const contractNumber = 'CON-' + contractId.slice(0, 6).toUpperCase()
  const viewUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://useapexscale.com'}/sign/contract/${contractId}`
  const totalFmt = typeof total === 'number' ? fmtCA(total) : String(total)

  const logoCell = logoUrl
    ? `<td style="vertical-align:middle;"><img src="${logoUrl}" width="30" height="30" style="width:30px;height:30px;display:block;object-fit:contain;" alt="${companyName}" /></td>`
    : `<td width="30" height="30" style="width:30px;height:30px;border-radius:7px;background:linear-gradient(135deg,#1a3a7c,#2563EB);text-align:center;vertical-align:middle;"><div style="width:30px;height:30px;line-height:30px;color:#fff;font-weight:800;font-size:14px;text-align:center;">${(companyName || 'A').charAt(0).toUpperCase()}</div></td>`

  const contactLine = companyPhone
    ? `Questions? Contact <b style="color:#475467;">${companyName}</b> &middot; ${companyPhone}`
    : `Questions? Contact <b style="color:#475467;">${companyName}</b>`

  const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#EAECF2" style="background:#EAECF2;"><tr><td align="center" style="padding:32px 16px;">
<div style="font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;width:100%;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 10px rgba(15,23,42,0.06);">
  <div style="padding:22px 40px 18px;">
    <table width="100%" role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td align="left" style="width:60%;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          ${logoCell}
          <td style="padding-left:8px;font-size:14px;font-weight:800;color:#0B1220;white-space:nowrap;">${companyName}</td>
        </tr></table>
      </td>
      <td align="right" style="width:40%;"><span style="background:#E7F6EE;color:#0F8A4D;font-size:11px;font-weight:800;padding:6px 12px;border-radius:99px;white-space:nowrap;display:inline-block;">${contractNumber} &middot; Signed</span></td>
    </tr></table>
  </div>
  <div style="height:1px;background:rgba(15,23,42,0.07);margin:0 40px;"></div>
  <div style="padding:24px 40px 8px;text-align:center;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px auto 18px;"><tr>
      <td width="52" height="52" style="width:52px;height:52px;border-radius:50%;background:#E7F6EE;text-align:center;vertical-align:middle;line-height:0;">
        <svg viewBox="0 0 24 24" width="22" height="22" style="vertical-align:middle;"><path d="M4 12.5 L10 18.5 L20 6.5" stroke="#0F8A4D" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </td>
    </tr></table>
    <h1 style="font-size:26px;font-weight:700;color:#0B1220;letter-spacing:-0.02em;line-height:1.2;margin:0 0 10px;">Your contract is signed.</h1>
    <p style="font-size:14.5px;line-height:1.6;color:#475467;margin:0 auto 26px;max-width:400px;">Thanks, ${clientName || 'there'}! Your signed copy is saved on file with <b style="color:#0B1220;">${companyName}</b>.</p>
  </div>
  <div style="padding:0 40px 8px;">
    <table width="100%" role="presentation" cellpadding="0" cellspacing="0" style="background:#F7F9FC;border-radius:12px;margin:0 0 24px;">
      <tr><td style="padding:14px 18px;border-bottom:1px solid rgba(15,23,42,0.06);">
        <table width="100%" role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td align="left" style="font-size:13px;color:#94A0B4;">Contract total</td>
          <td align="right" style="font-size:14px;color:#0B1220;font-weight:800;">${totalFmt}</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:14px 18px;">
        <table width="100%" role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td align="left" style="font-size:13px;color:#94A0B4;">Next step</td>
          <td align="right" style="font-size:13px;color:#0B1220;font-weight:700;">Deposit invoice sent separately</td>
        </tr></table>
      </td></tr>
    </table>
    <a href="${viewUrl}" style="display:block;background:#3B5BF5;color:#fff;text-decoration:none;text-align:center;font-size:16px;font-weight:800;padding:17px;border-radius:14px;">View signed contract &#8594;</a>
  </div>
  <div style="text-align:center;font-size:13.5px;color:#94A0B4;padding:26px 40px 22px;line-height:1.5;">${contactLine}</div>
  <div style="padding:16px 40px 24px;text-align:center;border-top:1px solid rgba(15,23,42,0.06);font-size:12px;color:#94A0B4;">Powered by <b style="color:#475467;">ApexScale</b></div>
</div>
</td></tr></table>`

  try {
    await resend.emails.send({
      from: `${companyName} <noreply@useapexscale.com>`,
      to: clientEmail,
      subject: `Your signed contract from ${companyName}`,
      ...(companyEmail ? { reply_to: companyEmail } : {}),
      html,
    })
  } catch (e: any) {
    console.error('[send-contract-signed] resend error:', e.message)
  }

  return NextResponse.json({ success: true })
}
