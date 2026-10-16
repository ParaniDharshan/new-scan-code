function GlyphShape({ type }) {
  const outline = { fill: 'none', stroke: 'currentColor', strokeWidth: 8 }

  switch (type) {
    case 'circle':
      return <circle cx="50" cy="50" r="30" {...outline} />
    case 'triangle':
      return <polygon points="50,10 90,90 10,90" {...outline} />
    case 'square':
      return <rect x="20" y="20" width="60" height="60" {...outline} />
    case 'diamond':
      return <polygon points="50,10 90,50 50,90 10,50" fill="currentColor" />
    case 'star':
      return <text x="50%" y="68%" textAnchor="middle" fontSize="80">★</text>
    case 'plus':
      return <text x="50%" y="68%" textAnchor="middle" fontSize="80">✚</text>
    case 'heart':
      return <text x="50%" y="68%" textAnchor="middle" fontSize="80">♥</text>
    case 'moon':
      return <text x="50%" y="68%" textAnchor="middle" fontSize="80">☾</text>
    case 'cross':
      return <text x="50%" y="68%" textAnchor="middle" fontSize="80">✕</text>
    case 'hourglass':
      return <text x="50%" y="68%" textAnchor="middle" fontSize="80">⌛</text>
    case 'ring':
      return <text x="50%" y="68%" textAnchor="middle" fontSize="80">◉</text>
    case 'spiral':
      return <text x="50%" y="68%" textAnchor="middle" fontSize="80">◌</text>
    case 'flower':
      return <text x="50%" y="68%" textAnchor="middle" fontSize="80">✿</text>
    case 'leaf':
      return <text x="50%" y="68%" textAnchor="middle" fontSize="80">❖</text>
    case 'sun':
      return <text x="50%" y="68%" textAnchor="middle" fontSize="80">☀</text>
    case 'hexagon':
      return <polygon points="50,10 85,30 85,70 50,90 15,70 15,30" {...outline} />
    default:
      return null
  }
}

export default GlyphShape
