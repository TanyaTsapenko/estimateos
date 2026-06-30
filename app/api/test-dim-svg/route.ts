export const runtime = 'nodejs'

export async function GET() {
  const svg = '<svg viewBox="0 0 215 255" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="180" height="200" fill="#EEF4FF" stroke="#334155" stroke-width="2.5"/><line x1="10" y1="226" x2="190" y2="226" stroke="#94A3B8" stroke-width="1"/><text x="100" y="243" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="700" fill="#475569">67"</text></svg>'
  const sharp = require('sharp')
  const png = await sharp(Buffer.from(svg)).resize(600, 720, { fit: 'contain' }).png().toBuffer()
  return new Response(png, { headers: { 'Content-Type': 'image/png' } })
}
