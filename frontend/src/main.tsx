import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App'
import './index.css'

const queryClient = new QueryClient()

// Google Client ID from environment
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

// Initialize theme from localStorage
const savedTheme = localStorage.getItem('theme-storage')
if (savedTheme) {
  try {
    const { state } = JSON.parse(savedTheme)
    document.documentElement.classList.add(state?.theme || 'light')
  } catch {
    document.documentElement.classList.add('light')
  }
} else {
  document.documentElement.classList.add('light')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>,
)
