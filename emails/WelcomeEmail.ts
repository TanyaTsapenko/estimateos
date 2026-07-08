const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://useapexscale.com'

export function welcomeEmailHtml(
  firstName: string,
  companyName?: string,
  roleLabel?: string,
  logoUrl?: string,
): { html: string; subject: string } {
  const subject = "Welcome to ApexScale — you're all set"

  const logoHtml = logoUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 22px;"><tr><td><img src="${logoUrl}" style="height:44px;max-width:160px;display:block;object-fit:contain;" alt="${companyName || 'ApexScale'}" /></td></tr></table>`
    : `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 22px;"><tr><td style="width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,#1a3a7c,#2563EB);text-align:center;"><div style="width:44px;height:44px;line-height:44px;color:#fff;font-weight:800;font-size:19px;">${(companyName || 'A').charAt(0).toUpperCase()}</div></td></tr></table>`

  const bodyPara = companyName && roleLabel
    ? `You're now part of <b style="color:#0B1220;">${companyName}</b> on ApexScale as <b style="color:#2563EB;">${roleLabel}</b>. Your account is ready — time to build your first estimate.`
    : `Your ApexScale account is ready. Time to build your first estimate.`

  const contactLine = companyName
    ? `Questions? Reach out to <b style="color:#475467;">${companyName}</b> or reply to this email.`
    : `Questions? Reply to this email or contact <b style="color:#475467;">support@useapexscale.com</b>.`

  const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#EAECF2" style="background:#EAECF2;"><tr><td align="center" style="padding:32px 16px;">
<div style="font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;width:100%;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 10px rgba(15,23,42,0.06);">
  <div style="padding:40px 40px 8px;text-align:center;">
    ${logoHtml}
    <div style="font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#94A0B4;margin-bottom:10px;">You're all set</div>
    <h1 style="font-size:30px;font-weight:700;color:#0B1220;letter-spacing:-0.02em;line-height:1.15;margin:0 0 16px;">Welcome${firstName ? `, ${firstName}` : ''}.</h1>
    <p style="font-size:15px;line-height:1.6;color:#475467;margin:0 auto 28px;max-width:400px;">${bodyPara}</p>
    <a href="${appUrl}/dashboard" style="display:inline-block;background:#3B5BF5;color:#fff;text-decoration:none;font-size:16px;font-weight:800;padding:16px 40px;border-radius:14px;">Go to dashboard &#8594;</a>
  </div>
  <div style="text-align:center;font-size:13px;color:#94A0B4;padding:34px 40px 22px;">${contactLine}</div>
  <div style="padding:16px 40px 24px;text-align:center;border-top:1px solid rgba(15,23,42,0.06);font-size:12px;color:#94A0B4;">Powered by <b style="color:#475467;">ApexScale</b></div>
</div>
</td></tr></table>`

  return { html, subject }
}
