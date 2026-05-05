import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const resend = new Resend(process.env.RESEND_API_KEY)

const ROLE_LABELS: Record<string, string> = {
  owner:      'Owner',
  estimator:  'Sales / Estimator',
  manager:    'Manager',
  admin:      'Office Admin',
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { inviteeEmail, inviteeName, role, resendId } = await request.json()
  if (!inviteeEmail) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const { data: prof } = await supabase
    .from('profiles')
    .select('company_name, first_name, last_name, plan')
    .eq('id', user.id)
    .single()

  const companyName = prof?.company_name || `${prof?.first_name || ''} ${prof?.last_name || ''}`.trim() || 'Your team'
  const admin = createAdminClient()

  let invitation: { id: string; token: string; invitee_email: string; invitee_name: string | null; role: string } | null = null

  if (resendId) {
    const { data } = await admin.from('team_invitations').select('*').eq('id', resendId).eq('owner_id', user.id).single()
    invitation = data
  } else {
    const { data: existing } = await admin.from('team_invitations')
      .select('id')
      .eq('owner_id', user.id)
      .eq('invitee_email', inviteeEmail)
      .eq('status', 'pending')
      .single()

    if (existing) return NextResponse.json({ error: 'A pending invite already exists for this email' }, { status: 409 })

    const { data, error } = await admin.from('team_invitations').insert({
      owner_id:      user.id,
      invitee_email: inviteeEmail,
      invitee_name:  inviteeName || null,
      role:          role || 'estimator',
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    invitation = data
  }

  if (!invitation) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })

  const joinLink = `${request.nextUrl.origin}/team/join/${invitation.token}`
  const roleLabel = ROLE_LABELS[invitation.role] || invitation.role
  const toName = invitation.invitee_name || inviteeEmail.split('@')[0]

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#F5F5F5">
<div style="max-width:500px;margin:0 auto;padding:24px 16px">
  <div style="background:linear-gradient(135deg,#1A1A1A,#353A3E);border-radius:16px 16px 0 0;padding:28px 24px">
    <div style="font-size:20px;font-weight:800;color:#fff">Estimate<span style="color:#D97706">OS</span></div>
    <div style="font-size:22px;font-weight:800;color:#fff;margin-top:14px">You're invited to join the team 👋</div>
    <div style="font-size:13px;color:rgba(255,255,255,.55);margin-top:6px">${companyName} · ${roleLabel}</div>
  </div>
  <div style="background:#fff;border-radius:0 0 16px 16px;padding:24px">
    <p style="font-size:14px;color:#1A1A1A;margin-bottom:14px">Hi ${toName},</p>
    <p style="font-size:13px;color:#6b7280;line-height:1.6;margin-bottom:20px">
      <strong>${companyName}</strong> has invited you to join their workspace on EstimateOS as a <strong>${roleLabel}</strong>.
      Click the button below to create your account and get started.
    </p>
    <div style="background:#FEF3C7;border:1px solid #FCD34D;border-radius:10px;padding:14px;margin-bottom:20px">
      <div style="font-size:11px;color:#92400E;font-weight:700;margin-bottom:4px">YOUR ROLE</div>
      <div style="font-size:15px;font-weight:800;color:#1A1A1A">${roleLabel}</div>
      <div style="font-size:11px;color:#92400E;margin-top:2px">Invited by ${companyName}</div>
    </div>
    <div style="text-align:center;margin-bottom:20px">
      <a href="${joinLink}" style="background:linear-gradient(135deg,#1A1A1A,#353A3E);color:#fff;text-decoration:none;border-radius:10px;padding:14px 28px;font-size:14px;font-weight:700;display:inline-block">
        Accept Invite &amp; Join →
      </a>
    </div>
    <p style="font-size:11px;color:#BFBFBF;line-height:1.6;text-align:center">
      This invite expires in 7 days. If you didn't expect this, you can ignore it.
    </p>
  </div>
  <p style="text-align:center;font-size:10px;color:#BFBFBF;margin-top:16px">Sent via EstimateOS · ${companyName}</p>
</div>
</body>
</html>`

  try {
    await resend.emails.send({
      from: `${companyName} via EstimateOS <onboarding@resend.dev>`,
      to: [inviteeEmail],
      subject: `You're invited to join ${companyName} on EstimateOS`,
      html,
    })
  } catch {
    // Email failure is non-fatal — invitation is already saved
  }

  return NextResponse.json({ success: true, invitation })
}
