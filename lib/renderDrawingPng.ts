import sharp from 'sharp'
import { renderV2DrawingSvg } from './renderV2DrawingSvg'

export async function renderDrawingPng(op: any, widthPx: number, heightPx: number): Promise<string> {
  const svg = renderV2DrawingSvg(op)
  const buf = await sharp(Buffer.from(svg))
    .resize(widthPx, heightPx, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer()
  return `data:image/png;base64,${buf.toString('base64')}`
}
