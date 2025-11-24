import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Console logs enabled for debugging - ALWAYS ENABLED
// Force enable console logging regardless of environment
console.log('%c✅ Console logging is ENABLED', 'color: green; font-size: 16px; font-weight: bold;');
console.log('🔍 Environment:', import.meta.env.MODE);
console.log('🔍 Production mode:', import.meta.env.PROD);

// Ensure console methods are never disabled
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
const originalInfo = console.info;
const originalDebug = console.debug;

// Override any attempts to disable console
Object.defineProperty(console, 'log', {
  value: originalLog,
  writable: false,
  configurable: false
});
Object.defineProperty(console, 'warn', {
  value: originalWarn,
  writable: false,
  configurable: false
});
Object.defineProperty(console, 'error', {
  value: originalError,
  writable: false,
  configurable: false
});
Object.defineProperty(console, 'info', {
  value: originalInfo,
  writable: false,
  configurable: false
});
Object.defineProperty(console, 'debug', {
  value: originalDebug,
  writable: false,
  configurable: false
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
