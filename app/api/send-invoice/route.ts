import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createAdminClient } from '@/lib/supabase/admin'
import { TAX_RATES } from '@/lib/pricing'

const fmtInv = (n: number) => 'CA$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
import { logActivity } from '@/lib/activity'
import { getCompanyName } from '@/lib/getCompanyName'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const { invoiceId } = await request.json()
  if (!invoiceId) return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: inv } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .eq('user_id', user.id)
    .single()
  if (!inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const [{ data: est }, { data: prof }] = await Promise.all([
    inv.estimate_id
      ? supabase.from('estimates').select('*').eq('id', inv.estimate_id).single()
      : Promise.resolve({ data: null }),
    supabase.from('profiles')
      .select('company_name, first_name, last_name, email, phone, company_contact_email, interac_email, gst_hst_number, logo_url')
      .eq('id', user.id)
      .single(),
  ])

  const clientEmail = est?.client_email
  if (!clientEmail) return NextResponse.json({ error: 'No client email on estimate' }, { status: 400 })

  let depositInv: { amount: number; status: string } | null = null
  if (inv.invoice_type === 'final' && inv.estimate_id) {
    const { data } = await supabase
      .from('invoices')
      .select('amount, status')
      .eq('estimate_id', inv.estimate_id)
      .eq('invoice_type', 'deposit')
      .single()
    depositInv = data
  }

  const adminClient = createAdminClient()
  const companyName = await getCompanyName(adminClient, est?.user_id || inv.user_id)

  const [, taxLabel] = TAX_RATES[est?.client_province || 'AB'] || [0.05, 'Tax']

  const dueDate = inv.due_date
    ? new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(inv.due_date))
    : null

  const isFinal = inv.invoice_type === 'final'
  const subject = isFinal
    ? `Final Invoice ${inv.invoice_number} — ${fmtInv(inv.amount)} due · ${companyName}`
    : `Invoice ${inv.invoice_number} — ${fmtInv(inv.amount)} due · ${companyName}`

  const projectAddress = [est?.client_address, est?.client_city].filter(Boolean).join(', ')
  const invBadge = inv.invoice_number + (isFinal ? ' · Final' : '')
  const invLogoHtml = (prof as any)?.logo_url
    ? `<img src="${(prof as any).logo_url}" style="height:30px;max-width:160px;display:block;object-fit:contain;" alt="${companyName}" />`
    : `<div style="display:flex;align-items:center;gap:8px;"><div style="width:30px;height:30px;border-radius:7px;background:linear-gradient(135deg,#1a3a7c,#2563EB);color:#fff;font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center;">${companyName.charAt(0).toUpperCase()}</div><span style="font-size:14px;font-weight:800;color:#0B1220;">${companyName}</span></div>`
  const invIntroPara = isFinal
    ? (projectAddress
        ? `The work at <b style="color:#0B1220;">${projectAddress}</b> is complete.${depositInv ? ` Your deposit has been applied — here's the remaining balance.` : ''}`
        : `Your project is complete.${depositInv ? ` Your deposit has been applied — here's the remaining balance.` : ''}`)
    : (projectAddress
        ? `Please find your invoice for the project at <b style="color:#0B1220;">${projectAddress}</b> below.`
        : `Please find your invoice below.`)
  const depositPaidRow = isFinal && depositInv
    ? `<div style="height:1px;background:rgba(15,23,42,0.07);"></div>
      <div style="display:flex;justify-content:space-between;padding:7px 0;"><span style="font-size:14px;color:#0F8A4D;">Deposit paid</span><span style="font-size:14px;font-weight:700;color:#0F8A4D;">&#8722; ${fmtInv(depositInv.amount)}</span></div>`
    : ''
  const projectTotalBlock = est?.total != null
    ? `<div style="border-left:3px solid #2563EB;padding:2px 0 2px 18px;margin:0 0 14px;">
      <div style="display:flex;justify-content:space-between;padding:7px 0;"><span style="font-size:14px;color:#475467;">Project total</span><span style="font-size:14px;font-weight:700;color:#0B1220;">${fmtInv(est.total)}</span></div>
      ${depositPaidRow}
    </div>`
    : ''
  const invETransferEmail = (prof as any)?.interac_email || prof?.email || null
  const invETransferBlock = invETransferEmail
    ? `<div style="border:1px solid rgba(15,23,42,0.10);border-radius:14px;padding:16px 18px;margin:0 0 18px;">
      <div style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#2563EB;margin-bottom:10px;">Pay by e-Transfer</div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;"><span style="font-size:13px;color:#94A0B4;">Send to</span><span style="font-size:13px;font-weight:700;color:#0B1220;">${invETransferEmail}</span></div>
      <div style="height:1px;background:rgba(15,23,42,0.06);"></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;"><span style="font-size:13px;color:#94A0B4;">Reference / message</span><span style="font-size:13px;font-weight:700;color:#0B1220;">${inv.invoice_number}</span></div>
      <div style="height:1px;background:rgba(15,23,42,0.06);"></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;"><span style="font-size:13px;color:#94A0B4;">Amount</span><span style="font-size:13px;font-weight:800;color:#1D4ED8;">${fmtInv(inv.amount)}</span></div>
    </div>`
    : ''
  const invContactFooter = prof?.phone
    ? `Questions? Contact <b style="color:#475467;">${companyName}</b> &middot; ${prof.phone}`
    : `Questions? Contact <b style="color:#475467;">${companyName}</b>`
  const estimateLink = est?.id
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://useapexscale.com'}/estimate/${est.id}`
    : `${process.env.NEXT_PUBLIC_APP_URL || 'https://useapexscale.com'}/dashboard`

  const html = `<div style="font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 10px rgba(15,23,42,0.06);">
  <div style="padding:22px 40px 18px;display:flex;justify-content:space-between;align-items:center;">
    ${invLogoHtml}
    <span style="background:#EEF3FF;color:#2563EB;font-size:12px;font-weight:800;padding:6px 14px;border-radius:99px;">${invBadge}</span>
  </div>
  <div style="height:1px;background:rgba(15,23,42,0.07);margin:0 40px;"></div>
  <div style="padding:24px 40px 8px;">
    <div style="font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#94A0B4;margin-bottom:10px;">${isFinal ? 'Project complete — thank you!' : 'Invoice for you'}</div>
    <h1 style="font-size:29px;font-weight:800;color:#0B1220;letter-spacing:-0.02em;line-height:1.1;margin:0 0 14px;">Your ${isFinal ? 'final' : ''} invoice.</h1>
    <p style="font-size:15px;line-height:1.6;color:#475467;margin:0 0 22px;">${invIntroPara}</p>
    ${projectTotalBlock}
    <div style="background:#F4F7FE;border:1px solid rgba(37,99,235,0.14);border-radius:14px;padding:18px 20px;display:flex;justify-content:space-between;align-items:center;margin:0 0 16px;">
      <div><div style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#94A0B4;">${isFinal ? 'Balance due' : 'Amount due'}</div>${dueDate ? `<div style="font-size:12px;color:#667085;margin-top:2px;">Due ${dueDate}</div>` : ''}</div>
      <div style="font-size:28px;font-weight:800;color:#1D4ED8;letter-spacing:-0.02em;">${fmtInv(inv.amount)}</div>
    </div>
    ${invETransferBlock}
    <a href="${estimateLink}" style="display:block;background:#3B5BF5;color:#fff;text-decoration:none;text-align:center;font-size:16px;font-weight:800;padding:17px;border-radius:14px;">View invoice &#8594;</a>
  </div>
  <div style="text-align:center;font-size:13.5px;color:#94A0B4;padding:18px 40px 22px;line-height:1.5;">${invContactFooter}</div>
  <div style="padding:16px 40px 24px;text-align:center;border-top:1px solid rgba(15,23,42,0.06);font-size:12px;color:#94A0B4;">Powered by <b style="color:#475467;">ApexScale</b></div>
</div>`

  const invoiceReplyTo = (prof as any)?.company_contact_email || (prof as any)?.interac_email || undefined
  try {
    const { error } = await resend.emails.send({
      from: `${companyName} <noreply@useapexscale.com>`,
      to: [clientEmail],
      subject,
      html,
      ...(invoiceReplyTo ? { reply_to: invoiceReplyTo } : {}),
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }

  logActivity(createServiceClient(), {
    user_id: est?.user_id || user.id,
    event_type: 'final_invoice_sent',
    actor_type: 'contractor',
    entity_type: 'invoice',
    entity_id: invoiceId,
    entity_number: est?.estimate_number,
    client_name: est?.client_name,
    amount: inv.amount,
  }).catch(() => {})

  return NextResponse.json({ success: true })
}
