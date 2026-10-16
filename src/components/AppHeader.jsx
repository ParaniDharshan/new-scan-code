function AppHeader({ page, onPageChange }) {
  return (
    <header className="site-header">
      <a className="brand" href="#generator" onClick={() => onPageChange('generator')}>
        GLYPH CODE
      </a>
      <span>Visual messages built from simple shapes.</span>
      <nav aria-label="Main navigation">
        <button
          className={page === 'generator' ? 'nav-button active' : 'nav-button'}
          onClick={() => onPageChange('generator')}
        >
          Generator
        </button>
        <button
          className={page === 'decoder' ? 'nav-button active' : 'nav-button'}
          onClick={() => onPageChange('decoder')}
        >
          QR &amp; Glyph Decoder
        </button>
      </nav>
    </header>
  )
}

export default AppHeader
