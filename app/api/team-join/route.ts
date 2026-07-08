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

  // 2. Owner: in-app notification + email (fetch owner profile first, reuse for welcome email)
  ;(async () => {
    const { data: ownerProf } = await admin
      .from('profiles')
      .select('email, company_name, first_name, last_name, logo_url')
      .eq('id', invite.owner_id)
      .single()

    const ownerEmail = ownerProf?.email
    const companyName = ownerProf?.company_name
      || `${ownerProf?.first_name || ''} ${ownerProf?.last_name || ''}`.trim()
      || 'Your team'
    const logoUrl = (ownerProf as any)?.logo_url || undefined

    // 1. Welcome email to the new member
    if (user.email) {
      const { html: welcomeHtml, subject: welcomeSubject } = welcomeEmailHtml(memberFirstName, companyName, roleLabel, logoUrl)
      resend.emails.send({
        from: 'ApexScale <noreply@useapexscale.com>',
        to: [user.email],
        subject: welcomeSubject,
        html: welcomeHtml,
      }).catch((e: Error) => console.error('[team-join] welcome email error:', e.message))
    }

    // In-app notification to owner
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
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://useapexscale.com'
      const ownerHtml = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#EAECF2" style="background:#EAECF2;"><tr><td align="center" style="padding:32px 16px;">
<div style="font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;width:100%;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 10px rgba(15,23,42,0.06);">
  <div style="padding:22px 40px 18px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td align="left" style="font-size:14px;font-weight:800;color:#0B1220;">ApexScale</td>
      <td align="right"><span style="background:#EEF3FF;color:#2563EB;font-size:12px;font-weight:800;padding:6px 14px;border-radius:99px;">Team update</span></td>
    </tr></table>
  </div>
  <div style="height:1px;background:rgba(15,23,42,0.07);margin:0 40px;"></div>
  <div style="padding:24px 40px 8px;">
    <h1 style="font-size:26px;font-weight:700;color:#0B1220;letter-spacing:-0.02em;line-height:1.2;margin:0 0 12px;">${memberName} joined your team.</h1>
    <p style="font-size:14.5px;line-height:1.6;color:#475467;margin:0 0 22px;">They accepted their invite and can now sign in to <b style="color:#0B1220;">${companyName}</b> on ApexScale.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F9FC;border-radius:12px;margin:0 0 24px;">
      <tr><td style="padding:14px 18px;border-bottom:1px solid rgba(15,23,42,0.06);">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td align="left" style="font-size:13px;color:#94A0B4;">Name</td>
          <td align="right" style="font-size:13.5px;color:#0B1220;font-weight:700;">${memberName}</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:14px 18px;border-bottom:1px solid rgba(15,23,42,0.06);">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td align="left" style="font-size:13px;color:#94A0B4;">Email</td>
          <td align="right" style="font-size:13.5px;color:#0B1220;font-weight:700;">${invite.invitee_email}</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:14px 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td align="left" style="font-size:13px;color:#94A0B4;">Role</td>
          <td align="right" style="font-size:13.5px;color:#2563EB;font-weight:800;">${roleLabel}</td>
        </tr></table>
      </td></tr>
    </table>
    <a href="${appUrl}/dashboard/settings" style="display:block;background:#3B5BF5;color:#fff;text-decoration:none;text-align:center;font-size:15px;font-weight:800;padding:15px;border-radius:12px;">View team members &#8594;</a>
  </div>
  <div style="padding:22px 40px 24px;text-align:center;border-top:1px solid rgba(15,23,42,0.06);font-size:12px;color:#94A0B4;margin-top:6px;">Powered by <b style="color:#475467;">ApexScale</b></div>
</div>
</td></tr></table>`

      resend.emails.send({
        from: 'ApexScale <noreply@useapexscale.com>',
        to: [ownerEmail],
        subject: `${memberName} joined your team`,
        html: ownerHtml,
      }).catch((e: Error) => console.error('[team-join] owner email error:', e.message))
    }
  })().catch((e: Error) => console.error('[team-join] post-join notifications error:', e.message))

  return NextResponse.json({ success: true, role: invite.role })
}
