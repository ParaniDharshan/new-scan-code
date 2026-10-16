import { useRef, useState } from 'react'
import GlyphPattern from '../components/GlyphPattern.jsx'
import { binaryToText, glyphMap, reverseGlyphMap, textToBinary } from '../utils/glyphCode.js'
import { getMatrixSize } from '../utils/glyphLayout.js'
import { exportGlyphPng } from '../utils/glyphPng.js'
import overviewImage from '../assets/glyph-code-overview.png'

function GlyphGeneratorPage() {
  const [message, setMessage] = useState('')
  const [glyphString, setGlyphString] = useState('')
  const [glyphs, setGlyphs] = useState([])
  const [decodedText, setDecodedText] = useState('')
  const [generatorError, setGeneratorError] = useState('')
  const generatedMessage = useRef('')
  const glyphCanvas = useRef(null)

  const matrixSize = getMatrixSize(glyphs.length)
  const matrixInfo = matrixSize
    ? `${matrixSize} × ${matrixSize} matrix · ${glyphs.length} data glyphs · 4 bits per glyph`
    : 'Enter a message to create a pattern'

  function generateGlyphCode(event) {
    event.preventDefault()
    if (!message) {
      setGeneratorError('Enter a message to generate a pattern.')
      return
    }
    const binary = textToBinary(message)
    const nextGlyphs = []
    for (let index = 0; index < binary.length; index += 4) {
      nextGlyphs.push(glyphMap[binary.slice(index, index + 4)])
    }

    const size = getMatrixSize(nextGlyphs.length)
    if (!size) {
      setGeneratorError('This message is too long for the supported pattern sizes.')
      return
    }

    generatedMessage.current = message
    setGlyphs(nextGlyphs)
    setGlyphString(JSON.stringify(nextGlyphs))
    setDecodedText('')
    setGeneratorError('')
  }

  function decodeGlyphString() {
    try {
      const parsed = JSON.parse(glyphString)
      if (!Array.isArray(parsed) || parsed.some((glyph) => !reverseGlyphMap[glyph])) {
        throw new Error('Glyph data must be a JSON array of supported glyph names.')
      }
      const text = binaryToText(parsed.map((glyph) => reverseGlyphMap[glyph]).join(''))
      setDecodedText(`Decoded: ${text}`)
      setGeneratorError('')
    } catch (error) {
      setGeneratorError(
        error instanceof SyntaxError
          ? 'Invalid glyph data. Enter a valid JSON array.'
          : error.message,
      )
      setDecodedText('')
    }
  }

  async function handlePngExport() {
    if (!glyphCanvas.current?.children.length) {
      setGeneratorError('Generate a glyph pattern before downloading it.')
      return
    }
    try {
      await exportGlyphPng(glyphCanvas.current, generatedMessage.current)
      setGeneratorError('')
    } catch (error) {
      setGeneratorError(error.message || 'The pattern could not be exported as a PNG.')
    }
  }

  return (
    <section className="container">
      <p className="eyebrow">VISUAL ENCODING</p>
      <h1>Glyph Code Generator</h1>
      <p className="subtitle">
        Turn a message into a pattern of meaningful shapes. Export it as an image or decode glyph data.
      </p>
      <form onSubmit={generateGlyphCode}>
        <label className="field-label" htmlFor="message">Your message</label>
        <input
          id="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Enter text to encode"
        />
        <div className="controls">
          <button type="submit">Generate pattern</button>
          <button type="button" className="secondary-button" onClick={decodeGlyphString}>
            Decode glyph data
          </button>
          <button type="button" className="secondary-button" onClick={handlePngExport}>
            Export PNG
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              if (glyphs.length) window.print()
              else setGeneratorError('Generate a glyph pattern before saving it as a PDF.')
            }}
          >
            Save as PDF
          </button>
        </div>
      </form>
      <label className="field-label" htmlFor="glyphString">Encoded glyph data (JSON)</label>
      <textarea
        id="glyphString"
        rows="3"
        value={glyphString}
        onChange={(event) => setGlyphString(event.target.value)}
        placeholder="Encoded glyph string will appear here"
      />
      {generatorError && <p className="message error" role="alert">{generatorError}</p>}
      <section className="output-card" aria-label="Generated glyph pattern">
        <div className="output-heading">
          <h2>Glyph pattern</h2>
          <span>{matrixInfo}</span>
        </div>
        <GlyphPattern ref={glyphCanvas} glyphs={glyphs} />
        {decodedText && <p className="decoded-text" aria-live="polite">{decodedText}</p>}
      </section>
      <details className="reference">
        <summary>About Glyph Code</summary>
        <img src={overviewImage} alt="Glyph Code overview, shape set, and pattern structure" />
      </details>
    </section>
  )
}

export default GlyphGeneratorPage
