import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { adoptUrlRoute } from './lib/urlRoute'

// Before the first render: the address bar decides where we open, so a
// refresh, a bookmark or a shared /admin/batches link lands where it says.
adoptUrlRoute()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
