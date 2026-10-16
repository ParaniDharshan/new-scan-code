const MATRIX_SIZES = [21, 25, 29, 33, 37, 41, 45, 49, 53, 57]

export function getMatrixSize(glyphCount) {
  if (glyphCount === 0) return 0
  return MATRIX_SIZES.find((size) => getDataSlots(size).length >= glyphCount) || 0
}

export function getStructuralCells(size) {
  const cells = new Map()
  const add = (row, column, type) => cells.set(`${row},${column}`, type)
  const finders = [[0, 0], [0, size - 7], [size - 7, 0]]

  finders.forEach(([top, left]) => {
    for (let row = 0; row < 7; row += 1) {
      for (let column = 0; column < 7; column += 1) {
        const dark =
          row === 0 || row === 6 || column === 0 || column === 6 ||
          (row >= 2 && row <= 4 && column >= 2 && column <= 4)
        add(top + row, left + column, dark ? 'finder-dark' : 'finder-light')
      }
    }
  })

  for (let position = 8; position < size - 8; position += 1) {
    const type = position % 2 === 0 ? 'timing-dark' : 'timing-light'
    add(6, position, type)
    add(position, 6, type)
  }

  if (size >= 25) {
    const origin = size - 9
    for (let row = 0; row < 5; row += 1) {
      for (let column = 0; column < 5; column += 1) {
        const dark =
          row === 0 || row === 4 || column === 0 || column === 4 ||
          (row === 2 && column === 2)
        add(origin + row, origin + column, dark ? 'alignment-dark' : 'alignment-light')
      }
    }
  }
  return cells
}

export function getDataSlots(size) {
  const structural = getStructuralCells(size)
  const slots = []

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (!structural.has(`${row},${column}`)) slots.push({ row, column })
    }
  }
  return slots
}
