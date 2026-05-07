import { StrictMode } from 'react'
import './i18n'
import { createRoot } from 'react-dom/client'
import 'remixicon/fonts/remixicon.css'
import './index.css'
import App from './App.tsx'
import { initFrontendMonitoring } from './lib/monitoring'

initFrontendMonitoring()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
