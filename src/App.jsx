import { useState } from 'react'
import AppHeader from './components/AppHeader.jsx'
import GlyphGeneratorPage from './pages/GlyphGeneratorPage.jsx'
import QrDecoderPage from './pages/QrDecoderPage.jsx'
import './App.css'

function App() {
  const [page, setPage] = useState('generator')

  return (
    <main className="app-shell">
      <AppHeader page={page} onPageChange={setPage} />
      {page === 'generator' ? <GlyphGeneratorPage /> : <QrDecoderPage />}
      <footer>Glyph Code · Simple shapes, meaningful messages.</footer>
    </main>
  )
}

export default App
