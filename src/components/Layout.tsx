import React from 'react'
import BitcoinStudioLogo from '../assets/bitcoin-studio-black-border.svg'

export const Layout: React.FC = ({children}) => (
  <>
    <header>
      <a href="https://www.bitcoin-studio.com" rel="noopener noreferrer" target="_blank">
        <img id="BitcoinStudioLogo" src={BitcoinStudioLogo} alt="Bitcoin Studio Logo"/>
      </a>
      <h1 className="header__title">CHOOSE YOUR COFFEE</h1>
    </header>

    <main>
      {children}
    </main>

    <footer>
      <p>
        {'Made By '}
        <a
          href="https://www.bitcoin-studio.com"
          rel="noopener noreferrer"
          target="_blank"
        >
          Bitcoin Studio
        </a>
        {' With Love ❤️'}
      </p>
    </footer>
  </>
)
