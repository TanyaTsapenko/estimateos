import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const { email } = await request.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const admin = createAdminClient()
  const baseUrl = 'https://useapexscale.com'

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'signup',
    email,
    options: { redirectTo: `${baseUrl}/auth/callback` },
  })

  if (error || !data?.properties?.action_link) {
    console.error('[send-confirmation] generateLink error:', error?.message)
    return NextResponse.json({ error: error?.message || 'Failed to generate link' }, { status: 500 })
  }

  console.log('[send-confirmation] redirectTo sent to generateLink:', `${baseUrl}/auth/callback`)
  console.log('[send-confirmation] action_link generated:', data.properties.action_link)

  const { error: emailError } = await resend.emails.send({
    from: 'ApexScale <noreply@useapexscale.com>',
    to: [email],
    subject: 'Confirm your ApexScale account',
    html: buildHtml(data.properties.action_link),
  })

  if (emailError) {
    console.error('[send-confirmation] Resend error:', emailError.message)
    return NextResponse.json({ error: emailError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

function buildHtml(confirmUrl: string): string {
  const logoSvg = `<svg width="32" height="32" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" style="display:block">
    <rect width="120" height="120" rx="16" fill="#2563EB"/>
    <g transform="translate(28 28) scale(1.0625)">
      <path d="M32 7 L10 50 Q8 54 13 54 L24 54 L32 36 Z" fill="white" opacity="0.55"/>
      <path d="M32 7 L54 50 Q56 54 51 54 L40 54 L32 36 Z" fill="white"/>
    </g>
  </svg>`

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#E2E5EC;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#E2E5EC;padding:20px 0">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:20px;overflow:hidden">

      <!-- HEADER -->
      <tr><td style="background:#080E1C;padding:28px 24px 36px">
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
          <tr>
            <td style="vertical-align:middle">${logoSvg}</td>
            <td style="vertical-align:middle;padding-left:10px;font-size:18px;font-weight:800;color:#ffffff;font-family:Arial,sans-serif;letter-spacing:-0.3px">ApexScale</td>
          </tr>
        </table>
        <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:8px;font-family:Arial,sans-serif">Welcome aboard</div>
        <div style="font-size:26px;font-weight:800;color:#ffffff;font-family:Arial,sans-serif;line-height:1.2">Confirm your account</div>
      </td></tr>

      <!-- BODY -->
      <tr><td style="background:#F5F6F8;padding:28px 24px">

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;margin-bottom:16px">
          <tr><td style="padding:28px 24px">
            <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#0A1628;font-family:Arial,sans-serif">One click to get started</p>
            <p style="margin:0 0 24px;font-size:14px;color:#64748B;line-height:1.6;font-family:Arial,sans-serif">
              Thanks for signing up for ApexScale. Click the button below to confirm your email address and activate your account.
            </p>
            <table cellpadding="0" cellspacing="0">
              <tr><td align="center" bgcolor="#2045B8" style="border-radius:12px">
                <a href="${confirmUrl}" target="_blank"
                  style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;letter-spacing:-0.2px">
                  Confirm my account →
                </a>
              </td></tr>
            </table>
          </td></tr>
        </table>

        <p style="margin:0;font-size:12px;color:#94A3B8;text-align:center;line-height:1.6;font-family:Arial,sans-serif">
          This link expires in 24 hours. If you didn&apos;t create an account, you can safely ignore this email.<br>
          Having trouble? Copy and paste this URL into your browser:<br>
          <span style="color:#2045B8;word-break:break-all">${confirmUrl}</span>
        </p>

      </td></tr>

      <!-- FOOTER -->
      <tr><td style="background:#ffffff;padding:14px 24px;text-align:center;font-size:11px;color:#9CA3AF;font-family:Arial,sans-serif">
        Powered by ApexScale &middot; <a href="https://useapexscale.com" style="color:#9CA3AF;text-decoration:none">useapexscale.com</a>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}
