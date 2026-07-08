import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { welcomeEmailHtml } from '@/emails/WelcomeEmail'

const resend = new Resend(process.env.RESEND_API_KEY)

const ROLE_LABELS: Record<string, string> = {
  owner:     'Owner',
  estimator: 'Sales / Estimator',
  manager:   'Manager',
  admin:     'Office Admin',
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Must be signed in to accept an invite' }, { status: 401 })

  const { token } = await request.json()
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const admin = createAdminClient()

  const { data: invite, error: invErr } = await admin
    .from('team_invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single()

  if (invErr || !invite) return NextResponse.json({ error: 'Invite not found or already used' }, { status: 404 })

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invite has expired' }, { status: 410 })
  }

  if (invite.owner_id === user.id) {
    return NextResponse.json({ error: 'You cannot accept your own invite' }, { status: 400 })
  }

  const appRole = invite.role === 'owner' ? 'owner' : 'estimator'

  // Upsert so the row is created if it doesn't exist yet (e.g. user just registered via invite link)
  const profileData: Record<string, unknown> = {
    id: user.id, team_owner_id: invite.owner_id, member_role: invite.role, role: appRole,
    onboarding_done: true,
  }
  if (invite.permissions) profileData.permissions = invite.permissions

  const { error: profileErr } = await admin
    .from('profiles')
    .upsert(profileData, { onConflict: 'id' })

  if (profileErr) {
    console.error('[team-join] profile upsert error:', profileErr)
    return NextResponse.json({ error: profileErr.message }, { status: 500 })
  }

  await admin
    .from('team_invitations')
    .update({ status: 'accepted' })
    .eq('id', invite.id)

  // Fire-and-forget: welcome email + owner notification
  const memberName = invite.invitee_name || user.email || 'New member'
  const memberFirstName = invite.invitee_name?.split(' ')[0] || ''
  const roleLabel = ROLE_LABELS[invite.role] || invite.role

  // 1. Welcome email to the new member
  if (user.email) {
    const { html: welcomeHtml, subject: welcomeSubject } = welcomeEmailHtml(memberFirstName)
    resend.emails.send({
      from: 'ApexScale <noreply@useapexscale.com>',
      to: [user.email],
      subject: welcomeSubject,
      html: welcomeHtml,
    }).catch((e: Error) => console.error('[team-join] welcome email error:', e.message))
  }

  // 2. Owner: in-app notification + email
  ;(async () => {
    const { data: ownerProf } = await admin
      .from('profiles')
      .select('email, company_name, first_name, last_name')
      .eq('id', invite.owner_id)
      .single()

    const ownerEmail = ownerProf?.email
    const companyName = ownerProf?.company_name
      || `${ownerProf?.first_name || ''} ${ownerProf?.last_name || ''}`.trim()
      || 'Your team'

    // In-app notification
    admin.from('notifications').insert({
      user_id: invite.owner_id,
      type: 'team_member_joined',
      title: 'Team member joined',
      body: `${memberName} joined as ${roleLabel}`,
      link: '/dashboard/settings',
      read: false,
    }).then(({ error }) => { if (error) console.error('[team-join] notification insert error:', error.message) })

    // Owner email
    if (ownerEmail) {
      const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#F5F6F8" style="background:#F5F6F8;"><tr><td align="center" style="padding:32px 16px;">
<div style="font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:560px;width:100%;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB;">
  <div style="padding:20px 32px;border-bottom:1px solid #F3F4F6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font-size:15px;font-weight:700;color:#0A1628;">ApexScale</td>
      <td align="right" style="font-size:12px;color:#9CA3AF;">Team notification</td>
    </tr></table>
  </div>
  <div style="padding:32px 32px 24px;text-align:center;">
    <div style="width:52px;height:52px;background:#EFF6FF;border-radius:26px;margin:0 auto 16px;line-height:52px;text-align:center;">
      <span style="font-size:22px;color:#2563EB;line-height:52px;">+</span>
    </div>
    <div style="font-size:22px;font-weight:800;color:#0A1628;letter-spacing:-0.5px;margin-bottom:6px;">New team member!</div>
    <div style="font-size:14px;color:#6B7280;line-height:1.5;"><span style="color:#2563EB;font-weight:600;">${memberName}</span> has joined ${companyName}.</div>
  </div>
  <div style="padding:0 32px 24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FB;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:12px 16px;border-bottom:1px solid #E5E7EB;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:14px;color:#6B7280;">Member</td>
          <td align="right" style="font-size:14px;color:#0A1628;font-weight:600;">${memberName}</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:12px 16px;border-bottom:1px solid #E5E7EB;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:14px;color:#6B7280;">Email</td>
          <td align="right" style="font-size:14px;color:#0A1628;font-weight:600;">${invite.invitee_email}</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:12px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:14px;color:#6B7280;">Role</td>
          <td align="right" style="font-size:14px;color:#2563EB;font-weight:700;">${roleLabel}</td>
        </tr></table>
      </td></tr>
    </table>
  </div>
  <div style="padding:0 32px 32px;">
    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://useapexscale.com'}/dashboard/settings" style="display:block;background:#2563EB;color:#fff;text-decoration:none;text-align:center;font-size:15px;font-weight:700;padding:14px;border-radius:12px;">View team members</a>
  </div>
  <div style="padding:20px 32px;border-top:1px solid #F3F4F6;text-align:center;font-size:12px;color:#9CA3AF;">
    Sent by ApexScale &middot; useapexscale.com
  </div>
</div>
</td></tr></table>`

      resend.emails.send({
        from: 'ApexScale <noreply@useapexscale.com>',
        to: [ownerEmail],
        subject: `${memberName} joined your team`,
        html,
      }).catch((e: Error) => console.error('[team-join] owner email error:', e.message))
    }
  })().catch((e: Error) => console.error('[team-join] post-join notifications error:', e.message))

  return NextResponse.json({ success: true, role: invite.role })
}
