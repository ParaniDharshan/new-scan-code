import { forwardRef } from 'react'
import GlyphShape from './GlyphShape.jsx'
import { getDataSlots, getMatrixSize, getStructuralCells } from '../utils/glyphLayout.js'

const GlyphPattern = forwardRef(function GlyphPattern({ glyphs }, ref) {
  const size = getMatrixSize(glyphs.length)
  const structuralCells = size ? getStructuralCells(size) : new Map()
  const slots = size ? getDataSlots(size) : []
  const glyphByPosition = new Map()

  if (glyphs.length) {
    glyphs.forEach((glyph, index) => {
      const slotIndex = Math.floor(((index + 0.5) * slots.length) / glyphs.length)
      const position = slots[slotIndex]
      glyphByPosition.set(`${position.row},${position.column}`, glyph)
    })
  }

  const patternSeed = glyphs.reduce(
    (seed, glyph, index) => (Math.imul(seed, 31) + glyph.charCodeAt(0) + index) >>> 0,
    7,
  )

  return (
    <div
      ref={ref}
      className="glyph-canvas"
      style={{ gridTemplateColumns: size ? `repeat(${size}, auto)` : undefined }}
    >
      {size > 0 && Array.from({ length: size * size }, (_, index) => {
        const row = Math.floor(index / size)
        const column = index % size
        const key = `${row},${column}`
        const structural = structuralCells.get(key)
        const glyph = glyphByPosition.get(key)
        let className = 'matrix-cell'

        if (structural) {
          className += ` ${structural}`
        } else if (glyph) {
          className += ' data-cell'
        } else {
          const module =
            (Math.imul(row + 1, 73856093) ^ Math.imul(column + 1, 19349663) ^ patternSeed) >>> 0
          className += ` data-cell filler-${module % 2 === 0 ? 'dark' : 'light'}`
        }

        return (
          <div className={className} key={key}>
            {!structural && glyph && (
              <svg viewBox="0 0 100 100" aria-hidden="true">
                <GlyphShape type={glyph} />
              </svg>
            )}
          </div>
        )
      })}
    </div>
  )
})

export default GlyphPattern
