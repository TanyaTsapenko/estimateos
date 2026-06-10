export function welcomeEmailHtml(firstName: string): { html: string; subject: string } {
  const subject = "Welcome to ApexScale — you're all set"
  const greeting = firstName ? `, ${firstName}` : ''

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:32px 16px">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:580px;width:100%">

      <!-- HEADER -->
      <tr><td style="background:linear-gradient(135deg,#1a4fd6 0%,#2563EB 60%,#3b7ff5 100%);padding:40px">
        <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.65);margin-bottom:14px;font-family:Arial,sans-serif">APEXSCALE</div>
        <div style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;line-height:1.15;margin-bottom:10px;font-family:Arial,sans-serif">You're in${greeting}.</div>
        <div style="font-size:14px;color:rgba(255,255,255,0.75);line-height:1.5;font-family:Arial,sans-serif">Your account is ready. Let&rsquo;s get to work.</div>
      </td></tr>

      <!-- BODY -->
      <tr><td style="padding:36px 40px">
        <p style="font-size:14px;color:#374151;line-height:1.75;margin:0 0 16px;font-family:Arial,sans-serif">
          ApexScale is built for contractors who want to look professional, close faster, and spend less time on paperwork.
        </p>
        <p style="font-size:14px;color:#374151;line-height:1.75;margin:0 0 28px;font-family:Arial,sans-serif">
          Your first estimate takes less than 5 minutes.
        </p>
        <table cellpadding="0" cellspacing="0">
          <tr><td style="background:#2563EB;border-radius:12px;box-shadow:0 6px 20px rgba(37,99,235,0.28)">
            <a href="https://useapexscale.com/dashboard" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif">Go to dashboard &rarr;</a>
          </td></tr>
        </table>
      </td></tr>

      <!-- FOOTER -->
      <tr><td style="border-top:1px solid #f0f0f0;padding:20px 40px;text-align:center">
        <p style="font-size:12px;color:#bbbbbb;margin:0;font-family:Arial,sans-serif">Questions? <a href="mailto:support@useapexscale.com" style="color:#bbbbbb;text-decoration:underline">support@useapexscale.com</a></p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`

  return { html, subject }
}
