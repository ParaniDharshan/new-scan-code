import { useEffect, useRef, useState } from 'react'
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
  const [savedCodes, setSavedCodes] = useState([])
  const [saveStatus, setSaveStatus] = useState('')
  const [saveError, setSaveError] = useState(false)
  const [saving, setSaving] = useState(false)
  const generatedMessage = useRef('')
  const glyphCanvas = useRef(null)

  useEffect(() => {
    let active = true
    fetch('/api/codes')
      .then(async (response) => {
        if (!response.ok) {
          const result = await response.json()
          throw new Error(result.error || 'Saved patterns could not be loaded.')
        }
        return response.json()
      })
      .then((codes) => {
        if (active) setSavedCodes(codes)
      })
      .catch((error) => {
        if (active) {
          setSaveError(true)
          setSaveStatus(error.message || 'Saved patterns could not be loaded.')
        }
      })

    return () => {
      active = false
    }
  }, [])

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
    setSaveStatus('')
    setSaveError(false)
  }

  async function saveGlyphCode() {
    if (!glyphs.length) {
      setSaveStatus('Generate a glyph pattern before saving it.')
      return
    }

    setSaving(true)
    setSaveStatus('')
    setSaveError(false)
    try {
      const response = await fetch('/api/codes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: generatedMessage.current, glyphs }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'The pattern could not be saved.')
      setSavedCodes((codes) => [result, ...codes])
      setSaveStatus('Pattern saved.')
    } catch (error) {
      setSaveError(true)
      setSaveStatus(error.message || 'The pattern could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  function loadSavedCode(code) {
    setMessage(code.message)
    generatedMessage.current = code.message
    setGlyphs(code.glyphs)
    setGlyphString(JSON.stringify(code.glyphs))
    setDecodedText('')
    setGeneratorError('')
    setSaveError(false)
    setSaveStatus(`Loaded saved pattern from ${new Date(`${code.createdAt}`).toLocaleString()}.`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
          <button
            type="button"
            className="secondary-button"
            onClick={saveGlyphCode}
            disabled={!glyphs.length || saving}
          >
            {saving ? 'Saving…' : 'Save pattern'}
          </button>
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
      {saveStatus && (
        <p className={saveError ? 'message error' : 'message'} role="status">
          {saveStatus}
        </p>
      )}
      <section className="saved-codes" aria-label="Saved glyph patterns">
        <div className="saved-codes-heading">
          <h2>Saved patterns</h2>
          <span>{savedCodes.length}</span>
        </div>
        {savedCodes.length ? (
          <ul>
            {savedCodes.map((code) => (
              <li key={code.id}>
                <div>
                  <strong>{code.message}</strong>
                  <time dateTime={code.createdAt}>
                    {new Date(`${code.createdAt}`).toLocaleString()}
                  </time>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => loadSavedCode(code)}
                >
                  Load
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="hint">Patterns you save will appear here.</p>
        )}
      </section>
      <details className="reference">
        <summary>About Glyph Code</summary>
        <img src={overviewImage} alt="Glyph Code overview, shape set, and pattern structure" />
      </details>
    </section>
  )
}

export default GlyphGeneratorPage
