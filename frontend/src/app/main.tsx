import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../styles/index.css'
import App from './App.tsx'

// Point d'entrée React de l'application.
const rootElement = document.getElementById('root')
if (!(rootElement instanceof HTMLElement)) {
  throw new TypeError('Élément racine #root introuvable')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
