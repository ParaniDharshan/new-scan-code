function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function addGlyphPayload(pngBytes, message) {
  const payload = new TextEncoder().encode(message)
  const type = new TextEncoder().encode('glYP')
  const chunk = new Uint8Array(payload.length + 12)
  const view = new DataView(chunk.buffer)
  view.setUint32(0, payload.length)
  chunk.set(type, 4)
  chunk.set(payload, 8)
  view.setUint32(chunk.length - 4, crc32(chunk.subarray(4, chunk.length - 4)))

  let end = 8
  while (end + 12 <= pngBytes.length) {
    const length = new DataView(pngBytes.buffer, pngBytes.byteOffset + end, 4).getUint32(0)
    if (end + 12 + length > pngBytes.length) throw new Error('Invalid PNG chunk.')
    const name = String.fromCharCode(...pngBytes.subarray(end + 4, end + 8))
    if (name === 'IEND') break
    end += length + 12
  }
  if (end + 12 > pngBytes.length) throw new Error('PNG end marker not found.')

  const output = new Uint8Array(pngBytes.length + chunk.length)
  output.set(pngBytes.subarray(0, end))
  output.set(chunk, end)
  output.set(pngBytes.subarray(end), end + chunk.length)
  return output
}

export async function exportGlyphPng(element, message) {
  const styles = getComputedStyle(element)
  const cellSize = Number.parseFloat(getComputedStyle(element.firstElementChild).width)
  const padding = Number.parseFloat(styles.paddingLeft)
  const gap = Number.parseFloat(styles.gap) || 0
  const columns = styles.gridTemplateColumns.trim().split(/\s+/).length
  const rows = Math.ceil(element.children.length / columns)
  const width = columns * (cellSize + gap) - gap + padding * 2
  const height = rows * (cellSize + gap) - gap + padding * 2
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/>`

  Array.from(element.children).forEach((cell, index) => {
    const x = padding + (index % columns) * (cellSize + gap)
    const y = padding + Math.floor(index / columns) * (cellSize + gap)
    let fill = '#ffffff'
    if (['finder-dark', 'timing-dark', 'alignment-dark', 'filler-dark'].some((name) =>
      cell.classList.contains(name))) fill = '#102f43'
    if (cell.classList.contains('timing-light')) fill = '#d8e2e9'
    svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fill}"/>`
    const icon = cell.querySelector('svg')
    if (icon) {
      const inset = cellSize * 0.1
      svg += `<svg x="${x + inset}" y="${y + inset}" width="${cellSize - inset * 2}" height="${cellSize - inset * 2}" viewBox="0 0 100 100">${icon.innerHTML}</svg>`
    }
  })
  svg += '</svg>'

  const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const image = new Image()
    await new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = () => reject(new Error('The pattern could not be rendered for PNG export.'))
      image.src = svgUrl
    })
    const canvas = document.createElement('canvas')
    canvas.width = width * 3
    canvas.height = height * 3
    const context = canvas.getContext('2d')
    if (!context) throw new Error('This browser could not create the PNG image.')
    context.scale(3, 3)
    context.drawImage(image, 0, 0)
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('The pattern could not be exported as a PNG.')
    const png = new Uint8Array(await blob.arrayBuffer())
    const output = addGlyphPayload(png, message)
    const downloadUrl = URL.createObjectURL(new Blob([output], { type: 'image/png' }))
    const link = document.createElement('a')
    link.download = 'glyph-code.png'
    link.href = downloadUrl
    link.click()
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

export async function readGlyphPayload(file) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const signature = [137, 80, 78, 71, 13, 10, 26, 10]
  if (bytes.length < 8 || !signature.every((value, index) => bytes[index] === value)) {
    return null
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let offset = 8
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset)
    const dataStart = offset + 8
    const chunkEnd = dataStart + length
    if (chunkEnd + 4 > bytes.length) throw new Error('This PNG file is damaged.')
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8))
    if (type === 'glYP') {
      const expected = view.getUint32(chunkEnd)
      if (expected !== crc32(bytes.subarray(offset + 4, chunkEnd))) {
        throw new Error('The Glyph Code image data is damaged.')
      }
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(dataStart, chunkEnd))
    }
    if (type === 'IEND') break
    offset = chunkEnd + 4
  }
  return null
}
