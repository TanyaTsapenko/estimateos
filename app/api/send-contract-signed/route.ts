import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const { clientEmail, clientName, companyName, companyPhone, companyEmail, contractId, total } = await req.json()

  const viewUrl = `https://useapexscale.com/sign/contract/${contractId}`

  await resend.emails.send({
    from: `${companyName} <noreply@useapexscale.com>`,
    to: clientEmail,
    subject: `Your signed contract from ${companyName}`,
    ...(companyEmail ? { reply_to: companyEmail } : {}),
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #0A0E1A; margin-bottom: 8px;">Hi ${clientName},</h2>
        <p style="color: #8892b0; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          Thank you for signing your contract with <strong style="color: #0A0E1A">${companyName}</strong>. Your contract has been saved and a copy is kept on file.
        </p>
        <div style="background: #F4F4F2; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="color: #8892b0; font-size: 13px; margin-bottom: 4px;">CONTRACT TOTAL</p>
          <p style="color: #2045B8; font-size: 24px; font-weight: 700; margin-bottom: 0;">CA$${total}</p>
        </div>
        <p style="color: #8892b0; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
          ${companyName} will be in touch shortly to confirm your installation date.
          ${companyEmail ? `You can reach them at <strong>${companyEmail}</strong>.` : companyPhone ? `You can reach them at <strong>${companyPhone}</strong>.` : ''}
        </p>
        <a href="${viewUrl}" style="display:inline-block;background:#2045B8;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px;margin-bottom:20px">
          View Signed Contract &rarr;
        </a>
        <hr style="border: none; border-top: 1px solid #E8E8E8; margin: 24px 0;">
        <p style="color: #C0C8D0; font-size: 12px;">Powered by ApexScale</p>
      </div>
    `,
  })

  return NextResponse.json({ success: true })
}
