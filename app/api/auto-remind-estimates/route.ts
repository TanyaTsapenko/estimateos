import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'
import { logActivity } from '@/lib/activity'
import { getCompanyName } from '@/lib/getCompanyName'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = Date.now()
  const origin = request.nextUrl.origin

  const { data: estimates, error } = await supabase
    .from('estimates')
    .select('id, estimate_number, client_name, client_email, client_address, user_id, sent_at, created_at, last_reminder_sent_at, reminder_count, valid_until, total')
    .eq('status', 'sent')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!estimates?.length) return NextResponse.json({ sent: 0 })

  const userIds = [...new Set(estimates.map((e: any) => e.user_id as string))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, company_name, logo_url, first_name, company_contact_email, interac_email, quote_settings')
    .in('id', userIds)

  const profMap: Record<string, any> = {}
  for (const p of profiles || []) profMap[p.id] = p

  const sent: string[] = []

  for (const est of estimates as any[]) {
    const prof = profMap[est.user_id]
    if (!prof) continue

    const remSettings = prof.quote_settings?.reminders
    if (!remSettings?.auto_enabled) continue

    const firstAfterDays: number = remSettings.first_after_days ?? 2
    const secondAfterDays: number = remSettings.second_after_days ?? 3
    const maxCount: number = remSettings.max_count ?? 3
    const reminderCount: number = est.reminder_count ?? 0

    if (reminderCount >= maxCount) continue

    // 24h cooldown
    if (est.last_reminder_sent_at) {
      const hoursSince = (now - new Date(est.last_reminder_sent_at).getTime()) / 3600000
      if (hoursSince < 24) continue
    }

    // Timing: first reminder uses first_after_days from sent_at/created_at;
    // subsequent reminders use second_after_days from last_reminder_sent_at
    const isDue = reminderCount === 0
      ? (now - new Date(est.sent_at || est.created_at).getTime()) >= firstAfterDays * 86400000
      : !!est.last_reminder_sent_at && (now - new Date(est.last_reminder_sent_at).getTime()) >= secondAfterDays * 86400000

    if (!isDue || !est.client_email) continue

    // Build email
    const companyName = await getCompanyName(supabase, est.user_id)
    const rawTemplate: string = (reminderCount <= 1 ? remSettings.template_1 : remSettings.template_2) || ''
    const expiryFmt = est.valid_until
      ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(est.valid_until + 'T00:00:00'))
      : ''
    const amtFmt = typeof est.total === 'number'
      ? `CA$${est.total.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : ''
    const clientLink = `${origin}/estimate/${est.id}`
    const defaultMsg = `Hi ${est.client_name || 'there'},\n\nJust following up on your estimate ${est.estimate_number}. Let us know if you have any questions — we'd love to help!\n\n${companyName}`
    const resolvedMessage = (rawTemplate || defaultMsg)
      .replace(/\{client_name\}/g, est.client_name || '')
      .replace(/\{address\}/g,     est.client_address || '')
      .replace(/\{amount\}/g,      amtFmt)
      .replace(/\{expiry_date\}/g, expiryFmt)
      .replace(/\{estimate_number\}/g, est.estimate_number || '')
    const msgHtml = resolvedMessage.split('\n').map((line: string) =>
      line
        ? `<p style="font-size:16px;color:#1E2A3B;line-height:1.75;margin:0 0 12px;">${line}</p>`
        : `<p style="margin:0 0 12px;">&nbsp;</p>`
    ).join('')
    const repName = prof.first_name || companyName
    const replyTo = prof.company_contact_email || prof.interac_email || undefined
    const logoHtml = prof.logo_url
      ? `<img src="${prof.logo_url}" style="height:30px;max-width:160px;display:block;object-fit:contain;" alt="${companyName}" />`
      : `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="30" height="30" style="width:30px;height:30px;border-radius:7px;background:linear-gradient(135deg,#1a3a7c,#2563EB);color:#fff;font-weight:800;font-size:14px;text-align:center;line-height:30px;vertical-align:middle;">${companyName.charAt(0).toUpperCase()}</td><td style="vertical-align:middle;padding-left:8px;"><span style="font-size:14px;font-weight:800;color:#0B1220;">${companyName}</span></td></tr></table>`

    const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#EAECF2" style="background:#EAECF2;"><tr><td align="center" style="padding:32px 16px;">
<div style="font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;width:100%;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 10px rgba(15,23,42,0.06);">
  <div style="padding:22px 40px 18px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td align="left" style="vertical-align:middle;">${logoHtml}</td>
      <td align="right" style="vertical-align:middle;white-space:nowrap;"><span style="background:#EEF3FF;color:#2563EB;font-size:12px;font-weight:800;padding:6px 14px;border-radius:99px;">${est.estimate_number || ''}</span></td>
    </tr></table>
  </div>
  <div style="height:1px;background:rgba(15,23,42,0.07);margin:0 40px;"></div>
  <div style="padding:30px 40px 10px;">
    ${msgHtml}
    <p style="font-size:16px;line-height:1.75;color:#1E2A3B;margin:6px 0 0;">— ${repName}</p>
  </div>
  <div style="padding:22px 40px 8px;">
    <table width="100%" role="presentation" cellpadding="0" cellspacing="0" style="background:#F7F9FC;border-radius:12px;">
      <tr><td style="padding:14px 18px;">
        <table width="100%" role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td align="left">
            <div style="font-size:13px;font-weight:700;color:#0B1220;">${est.estimate_number || 'Estimate'}</div>
            ${expiryFmt ? `<div style="font-size:11.5px;color:#94A0B4;margin-top:2px;">Valid until ${expiryFmt}</div>` : ''}
          </td>
          ${amtFmt ? `<td align="right" style="font-size:15px;font-weight:800;color:#2563EB;white-space:nowrap;">${amtFmt}</td>` : ''}
        </tr></table>
      </td></tr>
    </table>
  </div>
  <div style="padding:18px 40px 8px;">
    <a href="${clientLink}" style="display:block;background:#3B5BF5;color:#fff;text-decoration:none;text-align:center;font-size:16px;font-weight:800;padding:17px;border-radius:14px;">View estimate &#8594;</a>
  </div>
  ${replyTo
    ? `<div style="text-align:center;font-size:13px;color:#94A0B4;padding:20px 40px 22px;">Or reply to this email — it goes straight to <b style="color:#475467;">${companyName}</b>.</div>`
    : `<div style="padding:14px 40px 20px;"></div>`
  }
  <div style="padding:16px 40px 24px;text-align:center;border-top:1px solid rgba(15,23,42,0.06);font-size:12px;color:#94A0B4;">Powered by <b style="color:#475467;">ApexScale</b></div>
</div>
</td></tr></table>`

    const newCount = reminderCount + 1
    const isAtMax = newCount >= maxCount

    try {
      await resend.emails.send({
        from: `${companyName} <noreply@useapexscale.com>`,
        to: [est.client_email],
        subject: `Following up on your estimate, ${est.client_name || 'Client'}`,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      })
    } catch (e: any) {
      console.error(`[auto-remind] email failed for ${est.id}:`, e.message)
      continue
    }

    await supabase.from('estimates').update({
      last_reminder_sent_at: new Date().toISOString(),
      reminder_count: newCount,
      ...(isAtMax ? { status: 'expired', expired_reason: 'no_response_after_reminders' } : {}),
    }).eq('id', est.id)

    await logActivity(supabase, {
      user_id: est.user_id,
      event_type: 'reminder_sent',
      actor_type: 'contractor',
      entity_type: 'estimate',
      entity_id: est.id,
      entity_number: est.estimate_number,
      client_name: est.client_name || undefined,
    })

    if (isAtMax) {
      await logActivity(supabase, {
        user_id: est.user_id,
        event_type: 'estimate_auto_expired',
        actor_type: 'contractor',
        entity_type: 'estimate',
        entity_id: est.id,
        entity_number: est.estimate_number,
        client_name: est.client_name || undefined,
      })
      await supabase.from('notifications').insert({
        user_id: est.user_id,
        type: 'estimate_expired',
        title: 'Estimate expired',
        body: `${est.estimate_number} expired without a response${est.client_name ? ` from ${est.client_name}` : ''}`,
        read: false,
        link: `/dashboard/estimates/${est.id}`,
      })
    }

    sent.push(est.id)
  }

  return NextResponse.json({ sent: sent.length, ids: sent })
}
