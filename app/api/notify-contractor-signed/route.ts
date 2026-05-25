import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const { contractorEmail, contractorName, clientName, companyName, total, depositPercent, contractId } = await req.json()

  const depositAmount = Math.round(total * depositPercent / 100)

  await resend.emails.send({
    from: `EstimateOS <onboarding@resend.dev>`,
    to: contractorEmail,
    subject: `✓ ${clientName} signed the contract`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #0A0E1A 0%, #1A2744 100%); border-radius: 16px; padding: 28px; margin-bottom: 24px; text-align: center;">
          <div style="width: 56px; height: 56px; background: rgba(255,255,255,0.1); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
            <span style="color: #fff; font-size: 24px;">✓</span>
          </div>
          <h2 style="color: #fff; margin: 0 0 8px; font-size: 22px;">Contract Signed!</h2>
          <p style="color: rgba(255,255,255,0.5); margin: 0; font-size: 14px;">${clientName} has signed the contract</p>
        </div>

        <div style="background: #F4F4F2; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #E8E8E8;">
              <td style="padding: 10px 0; color: #8892b0; font-size: 13px;">Client</td>
              <td style="padding: 10px 0; color: #0A0E1A; font-size: 13px; font-weight: 600; text-align: right;">${clientName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #E8E8E8;">
              <td style="padding: 10px 0; color: #8892b0; font-size: 13px;">Contract Total</td>
              <td style="padding: 10px 0; color: #2045B8; font-size: 16px; font-weight: 700; text-align: right;">CA$${Number(total).toLocaleString('en-CA')}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #8892b0; font-size: 13px;">Deposit Due (${depositPercent}%)</td>
              <td style="padding: 10px 0; color: #059669; font-size: 14px; font-weight: 700; text-align: right;">CA$${depositAmount.toLocaleString('en-CA')}</td>
            </tr>
          </table>
        </div>

        <p style="color: #8892b0; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
          The signed contract is saved in your EstimateOS dashboard. Log in to view details and track the deposit.
        </p>

        <hr style="border: none; border-top: 1px solid #E8E8E8; margin: 24px 0;">
        <p style="color: #C0C8D0; font-size: 12px; text-align: center;">Sent via EstimateOS</p>
      </div>
    `,
  })

  return NextResponse.json({ success: true })
}
