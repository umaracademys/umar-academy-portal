import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-files',
      closeBundle() {
        try {
          // Copy _redirects file
          const redirectsPath = join(__dirname, 'public/_redirects')
          const distRedirectsPath = join(__dirname, 'dist/_redirects')
          if (existsSync(redirectsPath)) {
            copyFileSync(redirectsPath, distRedirectsPath)
            console.log('✅ _redirects file copied to dist')
          } else {
            console.warn('⚠️ _redirects file not found, skipping copy')
          }

          // Copy word_by_word.json to public/data/words if it exists in src
          const srcWordsPath = join(__dirname, 'src/data/words/word_by_word.json')
          const publicWordsDir = join(__dirname, 'public/data/words')
          const publicWordsPath = join(publicWordsDir, 'word_by_word.json')
          
          if (existsSync(srcWordsPath)) {
            // Create directory if it doesn't exist
            if (!existsSync(publicWordsDir)) {
              mkdirSync(publicWordsDir, { recursive: true })
            }
            // Copy file to public folder
            if (!existsSync(publicWordsPath)) {
              copyFileSync(srcWordsPath, publicWordsPath)
              console.log('✅ word_by_word.json copied to public/data/words')
            }
          }
        } catch (error) {
          console.warn('⚠️ Could not copy files:', error)
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
