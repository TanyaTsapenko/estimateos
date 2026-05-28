import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: prof } = await supabase
    .from('profiles')
    .select('company_name, first_name, last_name, city, province, phone, website, licence, insurance, logo_url, contract_terms, signature_url, completion_timeframe, payment_methods, customer_responsibilities, buyer_right_to_cancel, damage_disclaimer, permits_responsibility, project_manager')
    .eq('id', user.id)
    .single()

  if (!prof) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const contractText = prof.contract_terms?.trim()
  const companyName = prof.company_name || `${prof.first_name || ''} ${prof.last_name || ''}`.trim() || 'Your Company'
  const location = [prof.city, prof.province].filter(Boolean).join(', ')
  const today = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())

  const paragraphs = contractText
    ? contractText.split(/\n\n+/).map((p: string) => p.trim()).filter(Boolean)
    : []

  const p = prof as any
  const completionTimeframe: string | null = p?.completion_timeframe || null
  const paymentMethods: string[] = p?.payment_methods || []
  const customerResponsibilities: string | null = p?.customer_responsibilities || null
  const buyerRightToCancel: string | null = p?.buyer_right_to_cancel || null
  const damageDisclaimer: string | null = p?.damage_disclaimer || null
  const permitsResponsibility: string | null = p?.permits_responsibility || null
  const projectManager: string | null = p?.project_manager || null

  function clauseBlock(title: string, body: string | null): string {
    if (!body) return ''
    return `<div class="clause"><div class="clause-title">${title}</div><p>${body.replace(/\n/g, '<br>')}</p></div>`
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Contract Terms — ${companyName}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;color:#1A1A1A;background:#fff;padding:48px 56px;max-width:780px;margin:0 auto}
  .print-bar{background:#EEF2FF;border:1px solid #c7d2fe;border-radius:8px;padding:10px 16px;margin-bottom:32px;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#2045B8;font-weight:600}
  .print-bar button{background:#3B6CFF;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit}
  .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:2px solid #E0E0E0;margin-bottom:32px}
  .logo-img{max-height:64px;max-width:160px;object-fit:contain}
  .logo-text{font-size:20px;font-weight:800;color:#1A1A1A}
  .logo-text span{color:#3B6CFF}
  .company-meta{font-size:11px;color:#6b7280;line-height:1.7;margin-top:4px}
  .doc-info{text-align:right}
  .doc-title{font-size:22px;font-weight:800;color:#1A1A1A;letter-spacing:-.02em}
  .doc-sub{font-size:11px;color:#6b7280;margin-top:4px;line-height:1.6}
  .doc-date{font-size:10px;color:#BFBFBF;margin-top:8px}
  .divider{height:1px;background:#E0E0E0;margin:24px 0}
  .body-section{margin-bottom:28px}
  .body-section p{font-size:13px;color:#374151;line-height:1.8;margin-bottom:14px}
  .body-section p:last-child{margin-bottom:0}
  .empty-state{border:2px dashed #E0E0E0;border-radius:10px;padding:40px;text-align:center;color:#BFBFBF;font-size:13px}
  .clause{margin-bottom:22px;padding-bottom:22px;border-bottom:1px solid #F0F0F0}
  .clause:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0}
  .clause-title{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:6px}
  .payment-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
  .payment-pill{background:#EEF2FF;color:#2045B8;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:600}
  .sig-section{display:flex;gap:48px;margin-top:48px;padding-top:24px;border-top:2px solid #E0E0E0}
  .sig-box{flex:1}
  .sig-line{border-bottom:1px solid #1A1A1A;height:48px;margin-bottom:8px}
  .sig-label{font-size:10px;color:#6b7280;line-height:1.5}
  .sig-name{font-size:12px;font-weight:700;color:#1A1A1A}
  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #E0E0E0;font-size:10px;color:#BFBFBF;display:flex;justify-content:space-between}
  @media print{
    .print-bar{display:none}
    body{padding:32px 40px}
  }
</style>
</head>
<body>

<div class="print-bar">
  📄 To save as PDF: click Print below, then choose "Save as PDF"
  <button onclick="window.print()">🖨️ Print / Save PDF</button>
</div>

<div class="header">
  <div>
    ${prof.logo_url
      ? `<img src="${prof.logo_url}" alt="${companyName}" class="logo-img" />`
      : `<div class="logo-text">Apex<span>Scale</span></div>`}
    <div class="company-meta">
      ${companyName}${location ? `<br>${location}` : ''}${prof.phone ? `<br>${prof.phone}` : ''}${prof.website ? `<br>${prof.website}` : ''}${prof.licence ? `<br>Lic. ${prof.licence}` : ''}${prof.insurance ? `<br>Ins. ${prof.insurance}` : ''}
    </div>
  </div>
  <div class="doc-info">
    <div class="doc-title">Contract Terms</div>
    <div class="doc-sub">${companyName}<br>Standard Terms &amp; Conditions</div>
    <div class="doc-date">Generated ${today}</div>
  </div>
</div>

<div class="body-section">
  ${paragraphs.length > 0
    ? paragraphs.map((pg: string) => `<p>${pg.replace(/\n/g, '<br>')}</p>`).join('\n  ')
    : `<div class="empty-state">No contract terms have been added yet.<br>Go to Company Profile → Contract to add your standard terms.</div>`}
</div>

${completionTimeframe || customerResponsibilities || buyerRightToCancel || damageDisclaimer || permitsResponsibility || paymentMethods.length > 0 || projectManager ? `
<div class="divider"></div>
<div class="body-section">
  ${completionTimeframe ? `${clauseBlock('Completion Timeframe', completionTimeframe)}` : ''}
  ${paymentMethods.length > 0 ? `<div class="clause"><div class="clause-title">Accepted Payment Methods</div><div class="payment-pills">${paymentMethods.map((m: string) => `<span class="payment-pill">${m}</span>`).join('')}</div></div>` : ''}
  ${clauseBlock('Customer Responsibilities', customerResponsibilities)}
  ${clauseBlock("Buyer's Right to Cancel", buyerRightToCancel)}
  ${clauseBlock('Damage Disclaimer', damageDisclaimer)}
  ${clauseBlock('Permits Responsibility', permitsResponsibility)}
  ${projectManager ? `<div class="clause"><div class="clause-title">Project Manager</div><p style="font-weight:600;color:#0A1628">${projectManager}</p></div>` : ''}
</div>` : ''}

${paragraphs.length > 0 ? `
<div class="divider"></div>

<div class="sig-section">
  <div class="sig-box">
    <div class="sig-line"></div>
    <div class="sig-name">${companyName}</div>
    <div class="sig-label">Contractor signature &amp; date</div>
  </div>
  <div class="sig-box">
    <div class="sig-line"></div>
    <div class="sig-label">Client signature, printed name &amp; date</div>
  </div>
</div>` : ''}

${(prof as any)?.signature_url ? `
<div style="margin-top:40px;padding-top:20px;border-top:1px solid #E2E8F0">
  <div style="font-size:10px;color:#94A3B8;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">Authorized by</div>
  <img src="${(prof as any).signature_url}" style="max-height:50px;max-width:180px;object-fit:contain" alt="Contractor signature" />
  <div style="font-size:12px;color:#475569;margin-top:6px">${companyName || ''}</div>
</div>` : ''}

<div class="footer">
  <span>${companyName}${prof.licence ? ` · Lic. ${prof.licence}` : ''}${prof.insurance ? ` · Ins. ${prof.insurance}` : ''}</span>
  <span style="font-size:10px;color:#CBD5E1">Powered by ApexScale &middot; useapexscale.com</span>
</div>

</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="contract-terms-${companyName.replace(/\s+/g, '-').toLowerCase()}.html"`,
    },
  })
}
