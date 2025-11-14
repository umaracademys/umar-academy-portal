import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname, resolve } from 'path'

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

          const sqlJsSourceWasm = join(__dirname, 'node_modules/sql.js/dist/sql-wasm.wasm')
          const publicSqlJsDir = join(__dirname, 'public/sqljs')
          const publicSqlJsWasm = join(publicSqlJsDir, 'sql-wasm.wasm')

          if (existsSync(srcWordsPath) && !existsSync(publicWordsPath)) {
            // Create directory if it doesn't exist
            if (!existsSync(publicWordsDir)) {
              mkdirSync(publicWordsDir, { recursive: true })
            }
            // Copy file to public folder before Vite processes it
            copyFileSync(srcWordsPath, publicWordsPath)
            console.log('✅ word_by_word.json copied to public/data/words')
          }

          if (existsSync(sqlJsSourceWasm) && !existsSync(publicSqlJsWasm)) {
            if (!existsSync(publicSqlJsDir)) {
              mkdirSync(publicSqlJsDir, { recursive: true })
            }
            copyFileSync(sqlJsSourceWasm, publicSqlJsWasm)
            console.log('✅ sql-wasm.wasm copied to public/sqljs')
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

          // Ensure word_by_word.json is in dist/data/words/ after build
          const publicWordsPath = join(__dirname, 'public/data/words/word_by_word.json')
          const distWordsDir = join(__dirname, 'dist/data/words')
          const distWordsPath = join(distWordsDir, 'word_by_word.json')

          const publicSqlJsWasm = join(__dirname, 'public/sqljs/sql-wasm.wasm')
          const distSqlJsDir = join(__dirname, 'dist/sqljs')
          const distSqlJsWasm = join(distSqlJsDir, 'sql-wasm.wasm')

          if (existsSync(publicWordsPath)) {
            // Create directory if it doesn't exist
            if (!existsSync(distWordsDir)) {
              mkdirSync(distWordsDir, { recursive: true })
            }
            // Copy file to dist folder after build
            copyFileSync(publicWordsPath, distWordsPath)
            console.log('✅ word_by_word.json copied to dist/data/words/')
          } else {
            console.warn('⚠️ word_by_word.json not found in public folder')
          }

          if (existsSync(publicSqlJsWasm)) {
            if (!existsSync(distSqlJsDir)) {
              mkdirSync(distSqlJsDir, { recursive: true })
            }
            copyFileSync(publicSqlJsWasm, distSqlJsWasm)
            console.log('✅ sql-wasm.wasm copied to dist/sqljs')
          } else {
            console.warn('⚠️ sql-wasm.wasm not found in public/sqljs')
          }
        } catch (error) {
          console.warn('⚠️ Could not copy files to dist:', error)
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
      '@umar-academy/mushaf': resolve(__dirname, './packages/mushaf/src')
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mushaf-vendor': ['@umar-academy/mushaf']
        }
      }
    }
  }
})
