import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// DEBUG Stripe env — à retirer après validation
console.log('[TAYCO DEBUG] VITE_STRIPE_PUBLIC_KEY =', import.meta.env.VITE_STRIPE_PUBLIC_KEY)
console.log('[TAYCO DEBUG] MODE =', import.meta.env.MODE)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
