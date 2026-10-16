# Glyph Code

Glyph Code is a React app for generating visual glyph patterns and decoding QR or glyph images in the browser. The backend saves generated patterns in a local SQLite database; image decoding stays on the device.

## Requirements

- Node.js 22.13 or newer (the backend uses Node's built-in SQLite module)
- npm

## Run locally

```sh
npm install
npm run dev
```

Open the URL printed by Vite. The development server proxies `/api` requests to the backend on port 3001. The first run creates `server/data/glyph-code.sqlite`.
For a local production preview, start the backend with `npm start` in one terminal and run `npm run preview` in another. The preview server also proxies API requests to port 3001; using the full production server (`npm start`) serves both frontend and API together.

Use **Save pattern** in the generator to store the current message and glyphs. Saved patterns appear below the generator and can be loaded again. The database is local to this machine and has no user accounts.

The decorative Glyph Code pattern is a custom format, not a standard QR code. The generator also creates a separate camera-scannable QR code for the same message; use that code with the camera scanner. To decode a custom Glyph Code, upload its exported PNG so the app can read its embedded message.

## Production

```sh
npm run build
npm start
```

The backend serves the built frontend and API on port 3001. Set `PORT` to change the port, `HOST` to change the bind address (defaults to `127.0.0.1`), or `DATABASE_PATH` to choose another SQLite file.

## API

- `GET /api/health` - backend health check
- `GET /api/codes` - list saved patterns, newest first
- `POST /api/codes` - save a pattern with a JSON body containing `message` and `glyphs`

The API validates that the glyph sequence represents the supplied message before saving it.
