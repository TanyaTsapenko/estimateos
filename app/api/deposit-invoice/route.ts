import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/activity'
import { createClient } from '@/lib/supabase/server'
import { TAX_RATES } from '@/lib/pricing'

const fmtInv = (n: number) => 'CA$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
import { getCompanyName } from '@/lib/getCompanyName'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  // Allow either: valid internal secret (sign pages) OR authenticated dashboard user
  const internalSecret = process.env.INTERNAL_API_SECRET
  const headerSecret   = request.headers.get('x-internal-secret')
  const hasValidSecret = internalSecret && headerSecret === internalSecret

  if (!hasValidSecret) {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const { estimateId } = await request.json()
  if (!estimateId) return NextResponse.json({ error: 'Missing estimateId' }, { status: 400 })

  const admin = createAdminClient()

  const { data: est } = await admin.from('estimates').select('*').eq('id', estimateId).single()
  if (!est) return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })

  const { data: existing } = await admin.from('invoices')
    .select('id').eq('estimate_id', estimateId).eq('invoice_type', 'deposit').single()
  if (existing) return NextResponse.json({ skipped: true, reason: 'deposit invoice already exists' })

  const { data: prof } = await admin.from('profiles')
    .select('company_name, first_name, last_name, phone, email, interac_email, deposit_percent, company_contact_email, gst_hst_number, logo_url')
    .eq('id', est.user_id).single()

  const depositPct = est.deposit_percent ?? (prof as any)?.deposit_percent ?? 30
  const depositAmount = Math.round(est.total * depositPct) / 100

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 14)
  const dueDateStr = dueDate.toISOString().slice(0, 10)
  const dueDateFmt = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(dueDateStr + 'T00:00:00'))

  const { count } = await admin.from('invoices')
    .select('*', { count: 'exact', head: true }).eq('user_id', est.user_id)
  const invoiceNum = `INV-${String((count || 0) + 1).padStart(4, '0')}`

  const companyName = await getCompanyName(admin, est.user_id)
  const interacEmail = (prof as any)?.interac_email || prof?.email || null

  const { data: invoice, error: invErr } = await admin.from('invoices').insert({
    estimate_id:    estimateId,
    user_id:        est.user_id,
    invoice_number: invoiceNum,
    invoice_type:   depositPct === 100 ? 'final' : 'deposit',
    status:         'pending',
    amount:         depositAmount,
    due_date:       dueDateStr,
    notes:          depositPct === 100 ? `Full payment on ${est.estimate_number} — ${companyName}` : `${depositPct}% deposit on ${est.estimate_number} — ${companyName}`,
  }).select().single()

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })

  await admin.from('estimates').update({ invoice_id: invoice.id }).eq('id', estimateId)

  logActivity(admin, {
    user_id: est.user_id,
    event_type: 'deposit_invoice_sent',
    actor_type: 'contractor',
    entity_type: 'estimate',
    entity_id: estimateId,
    entity_number: est.estimate_number,
    client_name: est.client_name,
    amount: depositAmount,
  }).catch((e: any) => console.error('[deposit-invoice] logActivity error:', e))

  if (est.client_email) {
    const { data: con } = await admin.from('contracts').select('id').eq('estimate_id', estimateId).order('created_at', { ascending: false }).limit(1).maybeSingle()
    const contractLink = con?.id
      ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://useapexscale.com'}/sign/contract/${con.id}`
      : `${process.env.NEXT_PUBLIC_APP_URL || 'https://useapexscale.com'}/estimate/${estimateId}`

    const invoiceBadge = invoiceNum + (depositPct === 100 ? ' · Payment' : ' · Deposit')
    const depLogoHtml = (prof as any)?.logo_url
      ? `<img src="${(prof as any).logo_url}" style="height:30px;max-width:160px;display:block;object-fit:contain;" alt="${companyName}" />`
      : `<div style="display:flex;align-items:center;gap:8px;"><div style="width:30px;height:30px;border-radius:7px;background:linear-gradient(135deg,#1a3a7c,#2563EB);color:#fff;font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center;">${companyName.charAt(0).toUpperCase()}</div><span style="font-size:14px;font-weight:800;color:#0B1220;">${companyName}</span></div>`
    const depETransferBlock = interacEmail
      ? `<div style="border:1px solid rgba(15,23,42,0.10);border-radius:14px;padding:16px 18px;margin:0 0 18px;">
      <div style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#2563EB;margin-bottom:10px;">Pay by e-Transfer</div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;"><span style="font-size:13px;color:#94A0B4;">Send to</span><span style="font-size:13px;font-weight:700;color:#0B1220;">${interacEmail}</span></div>
      <div style="height:1px;background:rgba(15,23,42,0.06);"></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;"><span style="font-size:13px;color:#94A0B4;">Reference / message</span><span style="font-size:13px;font-weight:700;color:#0B1220;">${invoiceNum}</span></div>
      <div style="height:1px;background:rgba(15,23,42,0.06);"></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;"><span style="font-size:13px;color:#94A0B4;">Amount</span><span style="font-size:13px;font-weight:800;color:#1D4ED8;">${fmtInv(depositAmount)}</span></div>
    </div>`
      : ''
    const depContactFooter = prof?.phone
      ? `Questions? Contact <b style="color:#475467;">${companyName}</b> &middot; ${prof.phone}`
      : `Questions? Contact <b style="color:#475467;">${companyName}</b>`

    const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#EAECF2" style="background:#EAECF2;"><tr><td align="center" style="padding:32px 16px;">
<div style="font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;width:100%;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 10px rgba(15,23,42,0.06);">
  <div style="padding:22px 40px 18px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td align="left" style="vertical-align:middle;">${depLogoHtml}</td>
      <td align="right" style="vertical-align:middle;white-space:nowrap;"><span style="background:#EEF3FF;color:#2563EB;font-size:12px;font-weight:800;padding:6px 14px;border-radius:99px;">${invoiceBadge}</span></td>
    </tr></table>
  </div>
  <div style="height:1px;background:rgba(15,23,42,0.07);margin:0 40px;"></div>
  <div style="padding:24px 40px 8px;">
    <h1 style="font-size:29px;font-weight:800;color:#0B1220;letter-spacing:-0.02em;line-height:1.1;margin:0 0 14px;">Your ${depositPct === 100 ? 'payment' : 'deposit'} invoice.</h1>
    <p style="font-size:15px;line-height:1.6;color:#475467;margin:0 0 22px;">To confirm your order and schedule installation, please send the ${depositPct === 100 ? 'payment' : 'deposit'} by e-Transfer using the details below.</p>
    <div style="background:#F4F7FE;border:1px solid rgba(37,99,235,0.14);border-radius:14px;padding:20px;text-align:center;margin:0 0 16px;">
      <div style="font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#94A0B4;margin-bottom:6px;">${depositPct === 100 ? 'Payment' : 'Deposit'} due</div>
      <div style="font-size:34px;font-weight:800;color:#1D4ED8;letter-spacing:-0.02em;">${fmtInv(depositAmount)}</div>
      <div style="font-size:12.5px;color:#667085;margin-top:4px;">Due ${dueDateFmt}</div>
    </div>
    ${depETransferBlock}
    <a href="${contractLink}" style="display:block;background:#3B5BF5;color:#fff;text-decoration:none;text-align:center;font-size:16px;font-weight:800;padding:17px;border-radius:14px;">View invoice &#8594;</a>
  </div>
  <div style="text-align:center;font-size:13.5px;color:#94A0B4;padding:18px 40px 22px;line-height:1.5;">${depContactFooter}</div>
  <div style="padding:16px 40px 24px;text-align:center;border-top:1px solid rgba(15,23,42,0.06);font-size:12px;color:#94A0B4;">Powered by <b style="color:#475467;">ApexScale</b></div>
</div>
</td></tr></table>`

    const depositReplyTo = (prof as any)?.company_contact_email || (prof as any)?.interac_email || undefined
    try {
      await resend.emails.send({
        from: `${companyName} <noreply@useapexscale.com>`,
        to: [est.client_email],
        subject: `${depositPct === 100 ? 'Payment' : 'Deposit'} Invoice ${invoiceNum} — ${fmtInv(depositAmount)} due · ${companyName}`,
        html,
        ...(depositReplyTo ? { reply_to: depositReplyTo } : {}),
      })
    } catch (emailError) {
      console.error('[deposit-invoice] Failed to send email:', emailError)
    }
  } else {
    console.error('[deposit-invoice] skipped email: no client_email for estimate', est.id)
  }

  return NextResponse.json({ success: true, invoice })
}
