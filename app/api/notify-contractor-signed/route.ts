import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

const fmtCA = (n: number) => 'CA$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export async function POST(req: Request) {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret || req.headers.get('x-internal-secret') !== secret)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { contractorEmail, clientName, companyName, total, depositPercent, contractId } = await req.json()

  const depositAmount = Math.round(total * depositPercent) / 100
  const contractNumber = 'CON-' + contractId.slice(0, 6).toUpperCase()
  const viewUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://useapexscale.com'}/sign/contract/${contractId}`
  const timeFmt = new Date().toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true })
  const timestamp = `Today at ${timeFmt}`

  await resend.emails.send({
    from: `${companyName} <noreply@useapexscale.com>`,
    to: contractorEmail,
    subject: `${clientName} signed ${contractNumber}`,
    html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#EAECF2" style="background:#EAECF2;"><tr><td align="center" style="padding:32px 16px;">
<div style="font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;width:100%;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 10px rgba(15,23,42,0.06);">
  <div style="padding:40px 40px 8px;text-align:center;">
    <div style="font-size:12px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#0F8A4D;margin-bottom:14px;">Just signed</div>
    <h1 style="font-size:26px;font-weight:700;color:#0B1220;letter-spacing:-0.02em;line-height:1.25;margin:0 0 6px;">${clientName} signed<br>${contractNumber}.</h1>
    <div style="font-size:13px;color:#94A0B4;margin-bottom:28px;">${timestamp}</div>
    <div style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#94A0B4;margin-bottom:6px;">Deposit invoice sent &middot; due now</div>
    <div style="font-size:44px;font-weight:800;color:#2563EB;letter-spacing:-0.02em;margin-bottom:4px;">${fmtCA(depositAmount)}</div>
    <div style="font-size:13px;color:#94A0B4;margin-bottom:30px;">of ${fmtCA(total)} total</div>
    <a href="${viewUrl}" style="display:inline-block;background:#3B5BF5;color:#fff;text-decoration:none;font-size:15px;font-weight:800;padding:15px 36px;border-radius:14px;">View signed contract &#8594;</a>
  </div>
  <div style="padding:34px 40px 24px;text-align:center;border-top:1px solid rgba(15,23,42,0.06);font-size:12px;color:#94A0B4;">Powered by <b style="color:#475467;">ApexScale</b></div>
</div>
</td></tr></table>`,
  })

  return NextResponse.json({ success: true })
}
