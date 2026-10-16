export const glyphMap = {
  '0000': 'circle',
  '0001': 'triangle',
  '0010': 'square',
  '0011': 'diamond',
  '0100': 'star',
  '0101': 'plus',
  '0110': 'heart',
  '0111': 'moon',
  '1000': 'cross',
  '1001': 'hourglass',
  '1010': 'ring',
  '1011': 'spiral',
  '1100': 'flower',
  '1101': 'leaf',
  '1110': 'sun',
  '1111': 'hexagon',
}

export const reverseGlyphMap = Object.fromEntries(
  Object.entries(glyphMap).map(([bits, name]) => [name, bits]),
)

export function textToBinary(text) {
  return Array.from(new TextEncoder().encode(text), (byte) =>
    byte.toString(2).padStart(8, '0'),
  ).join('')
}

export function binaryToText(binary) {
  const bytes = []
  for (let index = 0; index + 8 <= binary.length; index += 8) {
    bytes.push(Number.parseInt(binary.slice(index, index + 8), 2))
  }
  return new TextDecoder().decode(new Uint8Array(bytes))
}
