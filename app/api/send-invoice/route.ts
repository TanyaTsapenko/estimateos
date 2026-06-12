import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createAdminClient } from '@/lib/supabase/admin'
import { TAX_RATES, fmtCAD } from '@/lib/pricing'
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
      .select('company_name, first_name, last_name, email, phone, company_contact_email, interac_email, gst_hst_number')
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
    ? `Final Invoice ${inv.invoice_number} — ${fmtCAD(inv.amount)} due · ${companyName}`
    : `Invoice ${inv.invoice_number} — ${fmtCAD(inv.amount)} due · ${companyName}`

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#E8E9EC">
<div style="max-width:520px;margin:0 auto;padding:28px 16px">

  <div style="background:linear-gradient(135deg,#0A0E1A 0%,#0D1630 50%,#1A2744 100%);border-radius:16px 16px 0 0;padding:32px 28px">
    <div style="font-size:18px;font-weight:800;color:#fff;letter-spacing:-.01em;margin-bottom:20px">${companyName}</div>
    <div style="font-size:22px;font-weight:800;color:#fff;margin-bottom:4px">${isFinal ? 'Final Invoice' : 'Invoice'}</div>
    <div style="font-size:13px;color:rgba(255,255,255,.5)">${inv.invoice_number} · ${companyName}</div>
  </div>

  <div style="background:#fff;border-radius:0 0 16px 16px;padding:28px">
    <p style="font-size:14px;color:#1A1A1A;font-weight:600;margin:0 0 8px">Hi ${est?.client_name || 'there'},</p>
    <p style="font-size:13px;color:#6b7280;line-height:1.7;margin:0 0 24px">
      ${isFinal
        ? `The project is complete — thank you! Here is your final invoice from <strong style="color:#1A1A1A">${companyName}</strong>. Your deposit has already been received.`
        : `<strong style="color:#1A1A1A">${companyName}</strong> has sent you an invoice for your project.`}
    </p>

    <div style="background:#F4F5F7;border:1.5px solid #1A2744;border-radius:12px;padding:18px;margin-bottom:24px">
      <div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#2045B8;margin-bottom:12px">${isFinal ? 'Final Invoice' : 'Invoice'} ${inv.invoice_number}</div>

      ${est ? `
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:5px">
        <span>Project total</span><span style="color:#1A1A1A;font-weight:600">${fmtCAD(est.total)} inc. ${taxLabel}</span>
      </div>` : ''}

      ${isFinal && depositInv ? `
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#16a34a;margin-bottom:14px">
        <span>Deposit received ✓</span><span style="font-weight:600">− ${fmtCAD(depositInv.amount)}</span>
      </div>` : ''}

      <div style="display:flex;justify-content:space-between;align-items:center;border-top:1.5px solid #1A2744;padding-top:14px">
        <div>
          <div style="font-size:13px;font-weight:700;color:#1A1A1A">${isFinal ? 'Balance due' : 'Amount due'}</div>
          ${dueDate ? `<div style="font-size:11px;color:#9ca3af;margin-top:2px">Due by ${dueDate}</div>` : ''}
        </div>
        <span style="font-size:26px;font-weight:800;color:#2045B8">${fmtCAD(inv.amount)}</span>
      </div>
    </div>

    ${prof?.email ? `
    <div style="background:#EEF2FF;border:1px solid #c7d2fe;border-radius:10px;padding:16px;margin-bottom:24px">
      <div style="font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#2045B8;margin-bottom:10px">Payment instructions</div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px">
        <span style="color:#6b7280">E-Transfer to</span>
        <span style="font-weight:700;color:#1A1A1A">${prof.email}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px">
        <span style="color:#6b7280">Reference / message</span>
        <span style="font-weight:600;color:#1A1A1A">${inv.invoice_number}</span>
      </div>
      ${(prof as any)?.gst_hst_number ? `
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px">
        <span style="color:#6b7280">GST/HST #</span>
        <span style="font-weight:600;color:#1A1A1A">${(prof as any).gst_hst_number}</span>
      </div>` : ''}
      ${prof?.phone ? `
      <div style="display:flex;justify-content:space-between;font-size:12px">
        <span style="color:#6b7280">Questions</span>
        <span style="font-weight:600;color:#1A1A1A">${prof.phone}</span>
      </div>` : ''}
    </div>` : ''}

    ${inv.notes ? `
    <p style="font-size:12px;color:#6b7280;line-height:1.7;margin:0 0 20px;padding:12px;background:#F9FAFB;border-radius:8px;border:1px solid #E0E0E0">
      ${inv.notes.replace(/\n/g, '<br>')}
    </p>` : ''}

    <p style="font-size:11px;color:#9ca3af;line-height:1.7;text-align:center;margin:0">
      Thank you for your business.${prof?.phone ? `<br>Questions? Contact us at ${prof.phone}` : ''}
    </p>
  </div>

  <p style="text-align:center;font-size:10px;color:#9ca3af;margin-top:16px">Powered by ApexScale</p>
</div>
</body>
</html>`

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
