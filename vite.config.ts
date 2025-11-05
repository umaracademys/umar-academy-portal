import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-files',
      buildStart() {
        try {
          // Copy word_by_word.json to public/data/words if it exists in src and not in public
          const srcWordsPath = join(__dirname, 'src/data/words/word_by_word.json')
          const publicWordsDir = join(__dirname, 'public/data/words')
          const publicWordsPath = join(publicWordsDir, 'word_by_word.json')
          
          if (existsSync(srcWordsPath) && !existsSync(publicWordsPath)) {
            // Create directory if it doesn't exist
            if (!existsSync(publicWordsDir)) {
              mkdirSync(publicWordsDir, { recursive: true })
            }
            // Copy file to public folder before Vite processes it
            copyFileSync(srcWordsPath, publicWordsPath)
            console.log('✅ word_by_word.json copied to public/data/words')
          }
        } catch (error) {
          console.warn('⚠️ Could not copy word_by_word.json:', error)
        }
      },
      closeBundle() {
        try {
          // Copy _redirects file to dist
          const redirectsPath = join(__dirname, 'public/_redirects')
          const distRedirectsPath = join(__dirname, 'dist/_redirects')
          if (existsSync(redirectsPath)) {
            copyFileSync(redirectsPath, distRedirectsPath)
          console.log('✅ _redirects file copied to dist')
          } else {
            console.warn('⚠️ _redirects file not found, skipping copy')
          }
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
