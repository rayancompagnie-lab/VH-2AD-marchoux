import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { watchOnlineStatus } from './utils/messagesSync'
import './styles/app.css'
import { watchOnlineStatus } from './utils/messagesSync'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((reg) => console.log('✅ Service Worker enregistré:', reg.scope))
      .catch((err) => console.warn('⚠️ Service Worker non enregistré:', err))
  })
}

watchOnlineStatus()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
watchOnlineStatus()

// Recharge l'app quand on revient en ligne
window.addEventListener('online', () => {
  console.log('🌐 Retour en ligne')
  // Force un refresh des données si nécessaire
})