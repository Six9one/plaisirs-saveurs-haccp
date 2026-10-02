import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { applyScreenConfig } from './config/screen.ts'

applyScreenConfig()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {/* Zone utile de l'écran : commence après la zone morte gauche */}
      <div className="app-viewport">
        <div className="app-scroll">
          <App />
        </div>
      </div>
    </ErrorBoundary>
  </StrictMode>,
)
