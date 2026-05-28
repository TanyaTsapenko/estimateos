import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ROLE_LABELS: Record<string, string> = {
  owner:      'Owner',
  estimator:  'Sales / Estimator',
  manager:    'Manager',
  admin:      'Office Admin',
}

export async function POST(request: NextRequest) {
  console.log('[team-invite] START')

  const RESEND_KEY = process.env.RESEND_API_KEY
  console.log('[team-invite] RESEND_API_KEY exists:', !!RESEND_KEY, 'prefix:', RESEND_KEY?.slice(0, 8))
  if (!RESEND_KEY) {
    console.error('[team-invite] RESEND_API_KEY is not set — cannot send email')
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
  }
  const resend = new Resend(RESEND_KEY)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.log('[team-invite] Unauthorized — no user session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  console.log('[team-invite] user:', user.id)

  const body = await request.json()
  const { inviteeEmail, inviteeName, role, resendId, permissions } = body
  console.log('[team-invite] payload:', { inviteeEmail, inviteeName, role, resendId, permissions })

  if (!inviteeEmail) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const { data: prof } = await supabase
    .from('profiles')
    .select('company_name, first_name, last_name, plan')
    .eq('id', user.id)
    .single()

  const companyName = prof?.company_name || `${prof?.first_name || ''} ${prof?.last_name || ''}`.trim() || 'Your team'
  console.log('[team-invite] companyName:', companyName)

  const admin = createAdminClient()

  let invitation: { id: string; token: string; invitee_email: string; invitee_name: string | null; role: string } | null = null

  if (resendId) {
    console.log('[team-invite] resending existing invite:', resendId)
    const { data, error } = await admin.from('team_invitations').select('*').eq('id', resendId).eq('owner_id', user.id).single()
    if (error) {
      console.error('[team-invite] fetch existing invite error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    invitation = data
  } else {
    const { data: existing } = await admin.from('team_invitations')
      .select('id')
      .eq('owner_id', user.id)
      .eq('invitee_email', inviteeEmail)
      .eq('status', 'pending')
      .single()

    if (existing) {
      console.log('[team-invite] duplicate pending invite for:', inviteeEmail)
      return NextResponse.json({ error: 'A pending invite already exists for this email' }, { status: 409 })
    }

    console.log('[team-invite] permissions to save:', JSON.stringify(permissions))
    console.log('[team-invite] inserting new invitation')
    const { data, error } = await admin.from('team_invitations').insert({
      owner_id:      user.id,
      invitee_email: inviteeEmail,
      invitee_name:  inviteeName || null,
      role:          role || 'estimator',
      permissions:   permissions || null,
    }).select().single()

    if (error) {
      console.error('[team-invite] insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    invitation = data
    console.log('[team-invite] invitation created, id:', invitation?.id, 'token:', invitation?.token)
  }

  if (!invitation) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  if (!invitation.token) {
    console.error('[team-invite] invitation has no token — check DB default for team_invitations.token')
    return NextResponse.json({ error: 'Invitation token missing' }, { status: 500 })
  }

  const joinLink = `${request.nextUrl.origin}/team/join/${invitation.token}`
  const roleLabel = ROLE_LABELS[invitation.role] || invitation.role
  const toName = invitation.invitee_name || inviteeEmail.split('@')[0]
  console.log('[team-invite] join link:', joinLink)

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#E8E9EC">
<div style="max-width:520px;margin:0 auto;padding:28px 16px">

  <div style="background:linear-gradient(135deg,#0A0E1A 0%,#0D1630 50%,#1A2744 100%);border-radius:16px 16px 0 0;padding:32px 28px">
    <div style="font-size:18px;font-weight:800;color:#fff;letter-spacing:-.01em;margin-bottom:20px">Apex<span style="color:#3B6CFF">Scale</span></div>
    <div style="font-size:22px;font-weight:800;color:#fff;margin-bottom:4px">You're invited to join the team</div>
    <div style="font-size:13px;color:rgba(255,255,255,.5)">${companyName} · ${roleLabel}</div>
  </div>

  <div style="background:#fff;border-radius:0 0 16px 16px;padding:28px">
    <p style="font-size:14px;color:#1A1A1A;font-weight:600;margin:0 0 8px">Hi ${toName},</p>
    <p style="font-size:13px;color:#6b7280;line-height:1.7;margin:0 0 24px">
      <strong style="color:#1A1A1A">${companyName}</strong> has invited you to join their workspace on ApexScale. Click below to create your account and get started.
    </p>

    <div style="background:#F4F5F7;border:1.5px solid #1A2744;border-radius:12px;padding:18px;margin-bottom:24px">
      <div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#2045B8;margin-bottom:10px">Your Invitation</div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:6px">
        <span>Company</span>
        <span style="font-weight:600;color:#1A1A1A">${companyName}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280">
        <span>Your role</span>
        <span style="font-weight:700;color:#2045B8">${roleLabel}</span>
      </div>
    </div>

    <div style="text-align:center;margin-bottom:24px">
      <a href="${joinLink}" style="background:#3B6CFF;color:#fff;text-decoration:none;border-radius:10px;padding:14px 32px;font-size:14px;font-weight:700;display:inline-block">
        Accept Invite &amp; Join →
      </a>
    </div>

    <p style="font-size:11px;color:#9ca3af;line-height:1.7;text-align:center">
      This invite expires in 7 days. If you didn't expect this, you can safely ignore it.
    </p>
  </div>

  <p style="text-align:center;font-size:10px;color:#9ca3af;margin-top:16px">Sent via ApexScale · ${companyName}</p>
</div>
</body>
</html>`

  console.log('[team-invite] sending email to:', inviteeEmail)
  const { data: emailData, error: emailError } = await resend.emails.send({
    from: `ApexScale <noreply@useapexscale.com>`,
    to:   [inviteeEmail],
    subject: `You're invited to join ${companyName} on ApexScale`,
    html,
  })

  if (emailError) {
    console.error('[team-invite] Resend error (full):', JSON.stringify(emailError))
    return NextResponse.json({
      success: true,
      invitation,
      emailWarning: emailError.message,
      emailError: JSON.stringify(emailError),
    })
  }

  console.log('[team-invite] email sent OK, id:', emailData?.id)
  return NextResponse.json({ success: true, invitation })
}
