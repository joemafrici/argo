import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { DerivedKeyProvider } from './contexts/DerivedKey.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DerivedKeyProvider>
      <App />
    </DerivedKeyProvider>
  </React.StrictMode>,
)
