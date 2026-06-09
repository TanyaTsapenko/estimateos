import sharp from 'sharp'

export async function svgToPngBase64(svgString: string, width = 80, height = 80): Promise<string> {
  try {
    const pngBuffer = await sharp(Buffer.from(svgString))
      .resize(width, height)
      .png()
      .toBuffer()
    return `data:image/png;base64,${pngBuffer.toString('base64')}`
  } catch {
    return ''
  }
}
