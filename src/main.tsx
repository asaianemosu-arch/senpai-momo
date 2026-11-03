import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './core/app.css'
import { firstVisit } from './core/storage'
import { loadSample } from './core/sample'

// Someone opening Momo for the first time starts in the sample shop.
if (firstVisit()) await loadSample().catch(() => undefined)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
