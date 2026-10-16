import jsQR from 'jsqr'
import { readGlyphPayload } from './glyphPng.js'

export async function decodeImage(file) {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')

  const glyphValue = await readGlyphPayload(file)
  if (glyphValue !== null) return { value: glyphValue, source: 'Glyph Code' }

  const bitmap = await createImageBitmap(file)
  try {
    const canvas = document.createElement('canvas')
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('This browser could not read the selected image.')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const qr = jsQR(imageData.data, canvas.width, canvas.height, {
      inversionAttempts: 'attemptBoth',
    })
    if (qr?.data) return { value: qr.data, source: 'standard QR code' }
  } finally {
    bitmap.close()
  }

  throw new Error(
    'No standard QR code was found. Older Glyph Code exports do not contain the message needed for decoding.',
  )
}
