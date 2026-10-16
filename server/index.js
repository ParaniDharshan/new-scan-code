import { createServer } from 'node:http'
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { glyphMap } from '../src/utils/glyphCode.js'

const serverDirectory = dirname(fileURLToPath(import.meta.url))
const databasePath = process.env.DATABASE_PATH || join(serverDirectory, 'data', 'glyph-code.sqlite')
const distDirectory = resolve(serverDirectory, '..', 'dist')
const maxRequestBytes = 64 * 1024
const validGlyphs = new Set(Object.values(glyphMap))

mkdirSync(dirname(databasePath), { recursive: true })
const database = new DatabaseSync(databasePath)
database.exec(`
  CREATE TABLE IF NOT EXISTS saved_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    glyphs TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

const listCodes = database.prepare(
  'SELECT id, message, glyphs, created_at FROM saved_codes ORDER BY id DESC',
)
const insertCode = database.prepare(
  'INSERT INTO saved_codes (message, glyphs) VALUES (?, ?)',
)

function sendJson(response, status, data) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(data))
}

function createRequestError(message, status) {
  const error = new Error(message)
  error.status = status
  return error
}

async function readJson(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > maxRequestBytes) {
      throw createRequestError('Request body is too large.', 413)
    }
    chunks.push(chunk)
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw createRequestError('Request body must be valid JSON.', 400)
  }
}

function encodeMessage(message) {
  const binary = Array.from(new TextEncoder().encode(message), (byte) =>
    byte.toString(2).padStart(8, '0'),
  ).join('')
  const glyphs = []
  for (let index = 0; index < binary.length; index += 4) {
    const glyph = glyphMap[binary.slice(index, index + 4)]
    if (!glyph) return null
    glyphs.push(glyph)
  }
  return glyphs
}

function getSavedCodes() {
  return listCodes.all().map((row) => ({
    id: row.id,
    message: row.message,
    glyphs: JSON.parse(row.glyphs),
    createdAt: `${row.created_at}Z`,
  }))
}

function serveStatic(request, response, pathname) {
  const relativePath = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1))
  const filePath = resolve(distDirectory, relativePath)
  if (filePath !== distDirectory && !filePath.startsWith(`${distDirectory}${sep}`)) {
    response.writeHead(403)
    response.end('Forbidden')
    return
  }

  try {
    if (!statSync(filePath).isFile()) throw new Error('Not a file')
    const contentTypes = {
      '.css': 'text/css; charset=utf-8',
      '.html': 'text/html; charset=utf-8',
      '.ico': 'image/x-icon',
      '.js': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
    }
    response.writeHead(200, {
      'content-type': contentTypes[extname(filePath)] || 'application/octet-stream',
    })
    response.end(readFileSync(filePath))
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('Not found. Start the app with npm run dev or build it with npm run build.')
  }
}

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname

  try {
    if (pathname === '/api/health' && request.method === 'GET') {
      sendJson(response, 200, { status: 'ok' })
      return
    }

    if (pathname === '/api/codes' && request.method === 'GET') {
      sendJson(response, 200, getSavedCodes())
      return
    }

    if (pathname === '/api/codes' && request.method === 'POST') {
      const body = await readJson(request)
      if (
        !body ||
        typeof body !== 'object' ||
        Array.isArray(body) ||
        typeof body.message !== 'string' ||
        body.message.length === 0 ||
        body.message.length > 12000
      ) {
        throw createRequestError('Message must be a non-empty string of at most 12,000 characters.', 400)
      }

      const expectedGlyphs = encodeMessage(body.message)
      if (
        !Array.isArray(body.glyphs) ||
        body.glyphs.length === 0 ||
        body.glyphs.length > 4096 ||
        body.glyphs.some((glyph) => !validGlyphs.has(glyph)) ||
        !expectedGlyphs ||
        JSON.stringify(body.glyphs) !== JSON.stringify(expectedGlyphs)
      ) {
        throw createRequestError('Glyph data does not match the message or contains unsupported glyphs.', 400)
      }

      const result = insertCode.run(body.message, JSON.stringify(body.glyphs))
      const savedCode = getSavedCodes().find((code) => code.id === Number(result.lastInsertRowid))
      sendJson(response, 201, savedCode)
      return
    }

    if (pathname.startsWith('/api/')) {
      sendJson(response, 404, { error: 'API route not found.' })
      return
    }

    if (request.method === 'GET' || request.method === 'HEAD') {
      serveStatic(request, response, pathname)
      return
    }

    response.writeHead(405, { allow: 'GET, HEAD' })
    response.end()
  } catch (error) {
    if (error.status) {
      sendJson(response, error.status, { error: error.message })
      return
    }
    console.error('Request failed:', error)
    sendJson(response, 500, { error: 'The server could not complete the request.' })
  }
})

const port = Number(process.env.PORT) || 3001
const host = process.env.HOST || '127.0.0.1'
server.listen(port, host, () => {
  console.log(`Glyph Code API listening on http://${host}:${port}`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => {
      database.close()
      process.exit(0)
    })
  })
}
