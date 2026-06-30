import sharp from 'sharp'
import { openingSvgString } from './openingSvgString'

export interface DrawingResult {
  png: string
  wLabel: string
  hLabel: string
}

export async function renderDrawingPng(op: any, widthPx: number, heightPx: number): Promise<DrawingResult> {
  const wLabel = op.width_in  ? `${op.width_in}"` : ''
  const hLabel = op.height_in ? `${op.height_in}"` : ''
  console.log('singleHung debug:', { type: op.type, shape: op.shape, width_in: op.width_in, height_in: op.height_in })
  const svg = openingSvgString(op)
  const buf = await sharp(Buffer.from(svg))
    .resize(widthPx, heightPx, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer()
  return { png: `data:image/png;base64,${buf.toString('base64')}`, wLabel, hLabel }
}
