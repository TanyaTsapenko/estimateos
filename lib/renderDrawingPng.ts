import sharp from 'sharp'
import { openingSvgString } from './openingSvgString'

export async function renderDrawingPng(op: any, widthPx: number, heightPx: number): Promise<string> {
  console.log('drawing op shape:', op.shape, 'type:', op.type, 'sub:', op.window_subtype)
  const svg = openingSvgString(op)
  const buf = await sharp(Buffer.from(svg))
    .resize(widthPx, heightPx, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer()
  return `data:image/png;base64,${buf.toString('base64')}`
}
