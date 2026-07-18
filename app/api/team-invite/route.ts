import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { inviteRateLimit } from '@/lib/rateLimit'
import { isValidEmail } from '@/lib/validation'

const ROLE_LABELS: Record<string, string> = {
  owner:      'Owner',
  estimator:  'Sales / Estimator',
  manager:    'Manager',
  admin:      'Office Admin',
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1'
  const { success } = await inviteRateLimit.limit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  console.log('[team-invite] START')

  const RESEND_KEY = process.env.RESEND_API_KEY
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
  const body = await request.json()
  const { inviteeEmail, inviteeName, role, resendId, permissions } = body
  if (!inviteeEmail) return NextResponse.json({ error: 'Email required' }, { status: 400 })
  if (!isValidEmail(inviteeEmail)) return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })

  const { data: prof } = await supabase
    .from('profiles')
    .select('company_name, first_name, last_name, plan, company_contact_email, interac_email, logo_url')
    .eq('id', user.id)
    .single()

  const companyName = prof?.company_name || `${prof?.first_name || ''} ${prof?.last_name || ''}`.trim() || 'Your team'
  console.log('[team-invite] companyName:', companyName)

  const admin = createAdminClient()

  let invitation: { id: string; token: string; invitee_email: string; invitee_name: string | null; role: string } | null = null

  if (resendId) {
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
      return NextResponse.json({ error: 'A pending invite already exists for this email' }, { status: 409 })
    }

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
  }

  if (!invitation) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  if (!invitation.token) {
    console.error('[team-invite] invitation has no token — check DB default for team_invitations.token')
    return NextResponse.json({ error: 'Invitation token missing' }, { status: 500 })
  }

  const joinLink = `${request.nextUrl.origin}/team/join/${invitation.token}`
  const roleLabel = ROLE_LABELS[invitation.role] || invitation.role

  const inviteLogoHtml = (prof as any)?.logo_url
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px;"><tr><td><img src="${(prof as any).logo_url}" style="height:44px;max-width:160px;display:block;object-fit:contain;" alt="${companyName}" /></td></tr></table>`
    : `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px;"><tr><td width="44" height="44" style="width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,#1a3a7c,#2563EB);text-align:center;"><div style="width:44px;height:44px;line-height:44px;color:#fff;font-weight:800;font-size:19px;">${companyName.charAt(0).toUpperCase()}</div></td></tr></table>`

  const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#EAECF2" style="background:#EAECF2;"><tr><td align="center" style="padding:32px 16px;">
<div style="font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;width:100%;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 10px rgba(15,23,42,0.06);">
  <div style="padding:40px 40px 8px;text-align:center;">
    ${inviteLogoHtml}
    <div style="font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#94A0B4;margin-bottom:10px;">${companyName} invited you</div>
    <h1 style="font-size:30px;font-weight:700;color:#0B1220;letter-spacing:-0.02em;line-height:1.15;margin:0 0 16px;">Come build estimates<br>with the team.</h1>
    <p style="font-size:15px;line-height:1.6;color:#475467;margin:0 auto 28px;max-width:400px;">You've been added as <b style="color:#2563EB;">${roleLabel}</b>. Accept your invite to start closing jobs on-site — no more paperwork back at the office.</p>
    <a href="${joinLink}" style="display:inline-block;background:#3B5BF5;color:#fff;text-decoration:none;font-size:16px;font-weight:800;padding:16px 40px;border-radius:14px;">Accept invite &#8594;</a>
  </div>
  <div style="text-align:center;font-size:13px;color:#94A0B4;padding:34px 40px 22px;">This invite expires in 7 days.</div>
  <div style="padding:16px 40px 24px;text-align:center;border-top:1px solid rgba(15,23,42,0.06);font-size:12px;color:#94A0B4;">Powered by <b style="color:#475467;">ApexScale</b></div>
</div>
</td></tr></table>`

  const inviteReplyTo = (prof as any)?.company_contact_email || (prof as any)?.interac_email || undefined
  const { data: emailData, error: emailError } = await resend.emails.send({
    from: `${companyName} <noreply@useapexscale.com>`,
    to:   [inviteeEmail],
    subject: `You're invited to join ${companyName}`,
    html,
    ...(inviteReplyTo ? { reply_to: inviteReplyTo } : {}),
  })

  if (emailError) {
    console.error('[team-invite] Resend error (full):', JSON.stringify(emailError))
    return NextResponse.json({
      error: emailError.message,
      emailFailed: true,
      invitation,
    }, { status: 500 })
  }

  return NextResponse.json({ success: true, invitation })
}
