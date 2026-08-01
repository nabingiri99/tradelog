import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './lib/AuthProvider.tsx'
import { SettingsProvider } from './lib/SettingsProvider.tsx'
import { TradeProvider } from './lib/TradeProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SettingsProvider>
        <TradeProvider>
          <App />
        </TradeProvider>
      </SettingsProvider>
    </AuthProvider>
  </StrictMode>,
)
