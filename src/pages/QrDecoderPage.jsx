import { useEffect, useRef, useState } from 'react'
import { decodeImage } from '../utils/imageDecoder.js'
import jsQR from 'jsqr'

function QrDecoderPage() {
  const [decoderStatus, setDecoderStatus] = useState('')
  const [decoderError, setDecoderError] = useState(false)
  const [decodedText, setDecodedText] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [cameraStream, setCameraStream] = useState(null)
  const [cameraStarting, setCameraStarting] = useState(false)
  const videoRef = useRef(null)
  const cameraStreamRef = useRef(null)
  const cameraRequestRef = useRef(0)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    return () => {
      cameraRequestRef.current += 1
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  useEffect(() => {
    if (!cameraStream || !videoRef.current) return undefined

    const video = videoRef.current
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { willReadFrequently: true })
    let animationFrame = 0
    let active = true

    video.srcObject = cameraStream

    function scanFrame() {
      if (!active) return
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth) {
        const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight))
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
        const result = jsQR(imageData.data, canvas.width, canvas.height, {
          inversionAttempts: 'attemptBoth',
        })
        if (result?.data) {
          setDecodedText(result.data)
          setDecoderError(false)
          setDecoderStatus('Decoded standard QR code successfully.')
          setCameraStream(null)
          return
        }
      }
      animationFrame = requestAnimationFrame(scanFrame)
    }

    video.play()
      .then(() => {
        if (!active) return
        if (!context) {
          setDecoderError(true)
          setDecoderStatus('This browser could not read the camera video.')
          setCameraStream(null)
          return
        }
        animationFrame = requestAnimationFrame(scanFrame)
      })
      .catch((error) => {
        if (!active) return
        setDecoderError(true)
        setDecoderStatus(error.message || 'The camera preview could not be started.')
        setCameraStream(null)
      })

    return () => {
      active = false
      cancelAnimationFrame(animationFrame)
      video.pause()
      video.srcObject = null
      cameraStream.getTracks().forEach((track) => track.stop())
      if (cameraStreamRef.current === cameraStream) cameraStreamRef.current = null
    }
  }, [cameraStream])

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setDecoderError(true)
      setDecoderStatus('Camera scanning is not supported by this browser or page connection. Use HTTPS or localhost.')
      return
    }

    const requestId = cameraRequestRef.current + 1
    cameraRequestRef.current = requestId
    setCameraStarting(true)
    setDecoderError(false)
    setDecoderStatus('Requesting camera access…')
    setDecodedText('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      })
      if (cameraRequestRef.current !== requestId) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      cameraStreamRef.current = stream
      setCameraStream(stream)
      setDecoderStatus('Point the camera at a QR code to scan it.')
    } catch (error) {
      if (cameraRequestRef.current !== requestId) return
      setDecoderError(true)
      setDecoderStatus(
        error.name === 'NotAllowedError'
          ? 'Camera access was denied. Allow camera permission in your browser and try again.'
          : error.name === 'NotFoundError'
            ? 'No camera was found on this device.'
            : error.message || 'The camera could not be started.',
      )
    } finally {
      if (cameraRequestRef.current === requestId) setCameraStarting(false)
    }
  }

  function stopCamera() {
    cameraRequestRef.current += 1
    setCameraStarting(false)
    setCameraStream(null)
    setDecoderStatus('Camera scanning stopped.')
    setDecoderError(false)
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (cameraStream || cameraStarting) stopCamera()
    setDecoderError(false)
    setDecoderStatus('Reading image…')
    setDecodedText('')
    setPreviewUrl(URL.createObjectURL(file))
    try {
      const result = await decodeImage(file)
      setDecodedText(result.value)
      setDecoderStatus(`Decoded ${result.source} successfully.`)
    } catch (error) {
      setDecoderError(true)
      setDecoderStatus(error.message || 'The image could not be decoded.')
    }
  }

  return (
    <section className="container decoder">
      <p className="eyebrow">ON-DEVICE DECODING</p>
      <h1>QR &amp; Glyph Code Decoder</h1>
      <p className="subtitle">
        Upload an image to read a standard QR code or a PNG exported by the Glyph Code Generator.
      </p>
      <section className="upload-box">
        <label htmlFor="imageFile"><strong>Select a QR or glyph pattern image</strong></label>
        <input id="imageFile" type="file" accept="image/*" onChange={handleImageChange} />
        <p className="hint">
          Your image is processed on this device. Glyph images must be exported as PNG from this app.
        </p>
      </section>
      <div className="scan-divider"><span>OR SCAN WITH CAMERA</span></div>
      <section className="camera-box" aria-label="Scan QR code with camera">
        {!cameraStream ? (
          <button type="button" onClick={startCamera} disabled={cameraStarting}>
            {cameraStarting ? 'Starting camera…' : 'Start camera scanner'}
          </button>
        ) : (
          <button type="button" className="secondary-button" onClick={stopCamera}>
            Stop scanning
          </button>
        )}
        <p className="hint">Camera access requires permission and a secure connection (HTTPS or localhost).</p>
        {cameraStream && (
          <video
            ref={videoRef}
            className="camera-preview"
            autoPlay
            muted
            playsInline
            aria-label="Live camera view for QR scanning"
          />
        )}
      </section>
      {decoderStatus && (
        <p
          className={decoderError ? 'message error' : 'message'}
          role="status"
          aria-live="polite"
        >
          {decoderStatus}
        </p>
      )}
      {previewUrl && <img className="preview" src={previewUrl} alt="Selected QR or glyph pattern preview" />}
      {decodedText && (
        <section className="result-card" aria-live="polite">
          <h2>Decoded value</h2>
          <p>{decodedText}</p>
        </section>
      )}
    </section>
  )
}

export default QrDecoderPage
