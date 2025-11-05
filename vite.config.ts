import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'fs'
import { join } from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-redirects',
      closeBundle() {
        try {
          copyFileSync(
            join(__dirname, 'public/_redirects'),
            join(__dirname, 'dist/_redirects')
          )
          console.log('✅ _redirects file copied to dist')
        } catch (error) {
          console.warn('⚠️ Could not copy _redirects file:', error)
        }
      }
    }
  ],
  publicDir: 'public',
  optimizeDeps: {
    exclude: ['sql.js']
  },
  resolve: {
    alias: {
      'sql.js': 'sql.js/dist/sql-wasm.js'
    }
  }
})
