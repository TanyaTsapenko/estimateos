import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const { contractorEmail, contractorName, clientName, companyName, total, depositPercent, contractId } = await req.json()

  const depositAmount = Math.round(total * depositPercent / 100)
  const viewUrl = `https://useapexscale.com/sign/contract/${contractId}`

  await resend.emails.send({
    from: `${companyName} <noreply@useapexscale.com>`,
    to: contractorEmail,
    subject: `✓ ${clientName} signed the contract`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F6F8;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F6F8;padding:32px 16px">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB;max-width:560px;width:100%">

      <!-- HEADER -->
      <tr><td style="padding:20px 32px;border-bottom:1px solid #F3F4F6">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td>
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="width:28px;height:28px;background:#2563EB;border-radius:7px;text-align:center;vertical-align:middle">
                <span style="color:#fff;font-size:14px;font-weight:700">A</span>
              </td>
              <td style="padding-left:8px;font-size:15px;font-weight:700;color:#0A1628;letter-spacing:-0.3px">ApexScale</td>
            </tr></table>
          </td>
          <td align="right" style="font-size:12px;color:#9CA3AF">Signed contract notification</td>
        </tr></table>
      </td></tr>

      <!-- HERO -->
      <tr><td style="padding:32px 32px 24px;text-align:center">
        <div style="width:52px;height:52px;background:#DCFCE7;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;line-height:52px">
          <span style="color:#16A34A;font-size:22px;line-height:52px">✓</span>
        </div>
        <div style="font-size:22px;font-weight:800;color:#0A1628;letter-spacing:-0.5px;margin-bottom:6px">Contract signed!</div>
        <div style="font-size:14px;color:#6B7280;line-height:1.5"><span style="color:#2563EB;font-weight:600">${clientName}</span> has signed the contract.<br>Review the details and follow up.</div>
      </td></tr>

      <!-- INFO CARD -->
      <tr><td style="padding:0 32px 24px">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FB;border-radius:12px;overflow:hidden">
          <tr><td style="padding:12px 16px;border-bottom:1px solid #E5E7EB">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:14px;color:#6B7280">Client</td>
              <td align="right" style="font-size:14px;color:#0A1628;font-weight:600">${clientName}</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:12px 16px;border-bottom:1px solid #E5E7EB">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:14px;color:#6B7280">Signed</td>
              <td align="right" style="font-size:14px;color:#0A1628;font-weight:600">${new Date().toLocaleDateString('en-CA', { year:'numeric', month:'long', day:'numeric' })}</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:12px 16px;border-bottom:1px solid #E5E7EB">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:14px;color:#6B7280">Contract total</td>
              <td align="right" style="font-size:14px;color:#2563EB;font-weight:700">CA$${Number(total).toLocaleString('en-CA')}</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:12px 16px">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:14px;color:#6B7280">Deposit due (${depositPercent}%)</td>
              <td align="right" style="font-size:14px;color:#0F8A6B;font-weight:700">CA$${depositAmount.toLocaleString('en-CA')}</td>
            </tr></table>
          </td></tr>
        </table>
      </td></tr>

      <!-- BUTTON -->
      <tr><td style="padding:0 32px 32px">
        <a href="${viewUrl}" style="display:block;background:#2563EB;color:#ffffff;text-align:center;padding:14px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:-0.1px">View signed contract</a>
      </td></tr>

      <!-- FOOTER -->
      <tr><td style="padding:20px 32px;border-top:1px solid #F3F4F6;text-align:center">
        <div style="font-size:12px;color:#9CA3AF;line-height:1.6">Sent by ApexScale · useapexscale.com<br>${companyName} · Canada</div>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>
`,
  })

  return NextResponse.json({ success: true })
}
