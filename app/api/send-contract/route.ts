import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const { contractId, estimateId, clientEmail, clientName, companyName } = await req.json()

  if (!clientEmail) return NextResponse.json({ error: 'No client email' }, { status: 400 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://estimateos-eta.vercel.app'
  const signUrl = `${appUrl}/sign/contract/${contractId}`

  try {
    await resend.emails.send({
      from: `${companyName} via EstimateOS <onboarding@resend.dev>`,
      to: clientEmail,
      subject: `Contract from ${companyName} — Ready to Sign`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #0A0E1A; margin-bottom: 8px;">Hi ${clientName || 'there'},</h2>
          <p style="color: #8892b0; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            ${companyName} has sent you a contract for review and signature. Please click the button below to review and sign.
          </p>
          <a href="${signUrl}" style="display: inline-block; background: #2045B8; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 16px; margin-bottom: 24px;">
            Review &amp; Sign Contract &rarr;
          </a>
          <p style="color: #C0C8D0; font-size: 13px;">
            If you did not expect this contract, you can safely ignore this email.
          </p>
        </div>
      `,
    })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
