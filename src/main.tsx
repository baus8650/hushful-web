import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// Token-bearing URLs and shared wishlists must not be indexed.
if (new URLSearchParams(window.location.search).has('resetToken') || new URLSearchParams(window.location.search).has('verifyEmailToken') || /^\/share(?:\/|$)/.test(window.location.pathname)) {
  const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]') ?? document.createElement('meta')
  robots.name = 'robots'
  robots.content = 'noindex, follow'
  document.head.appendChild(robots)
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
