import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './lib/theme'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'var(--surface)',
              color: 'var(--ink)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              boxShadow: 'var(--shadow-md)',
              fontSize: '13px',
              fontWeight: 500,
            },
            success: { iconTheme: { primary: 'var(--fresh)', secondary: '#fff' } },
            error: { iconTheme: { primary: 'var(--expired)', secondary: '#fff' } },
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
