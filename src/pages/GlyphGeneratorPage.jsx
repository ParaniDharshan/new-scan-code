import { useEffect, useRef, useState } from 'react'
import GlyphPattern from '../components/GlyphPattern.jsx'
import { binaryToText, glyphMap, reverseGlyphMap, textToBinary } from '../utils/glyphCode.js'
import { getMatrixSize } from '../utils/glyphLayout.js'
import { exportGlyphPng } from '../utils/glyphPng.js'
import { apiRequest } from '../utils/api.js'
import overviewImage from '../assets/glyph-code-overview.png'
import QRCode from 'qrcode'

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
  const [qrMessage, setQrMessage] = useState('')
  const [qrImage, setQrImage] = useState('')
  const [qrError, setQrError] = useState('')
  const [qrRequest, setQrRequest] = useState(0)
  const generatedMessage = useRef('')
  const glyphCanvas = useRef(null)

  useEffect(() => {
    let active = true
    apiRequest('/api/codes')
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

  useEffect(() => {
    if (!qrMessage) return undefined

    let active = true
    QRCode.toDataURL(qrMessage, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 320,
      color: { dark: '#102f43', light: '#ffffff' },
    })
      .then((url) => {
        if (active) {
          setQrImage(url)
          setQrError('')
        }
      })
      .catch((error) => {
        if (active) {
          setQrImage('')
          setQrError(error.message || 'A scannable QR code could not be generated.')
        }
      })

    return () => {
      active = false
    }
  }, [qrMessage, qrRequest])

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
    setQrImage('')
    setQrError('')
    setQrMessage(message)
    setQrRequest((request) => request + 1)
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
      const result = await apiRequest('/api/codes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: generatedMessage.current, glyphs }),
      })
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

  function downloadQrPng() {
    if (!qrImage) return
    const link = document.createElement('a')
    link.download = 'glyph-code-qr.png'
    link.href = qrImage
    link.click()
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
      {qrMessage && (
        <section className="qr-output-card" aria-label="Scannable QR code">
          <div>
            <h2>Camera-scannable QR code</h2>
            <p className="hint">
              The glyph pattern above is a custom format, not a standard QR code. Scan this QR with
              the camera scanner or download it as a PNG.
            </p>
          </div>
          {qrImage ? (
            <>
              <img src={qrImage} alt={`Standard QR code containing: ${qrMessage}`} />
              <button type="button" className="secondary-button" onClick={downloadQrPng}>
                Download scannable QR PNG
              </button>
            </>
          ) : (
            <p className={qrError ? 'message error' : 'message'} role={qrError ? 'alert' : 'status'}>
              {qrError || 'Creating scannable QR code…'}
            </p>
          )}
        </section>
      )}
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
