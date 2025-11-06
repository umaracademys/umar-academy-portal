import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-mushaf-data',
      closeBundle() {
        try {
          // Ensure word_by_word.json is in dist/public/data/words/ after build
          const publicWordsPath = join(__dirname, 'public/data/words/word_by_word.json');
          const distWordsDir = join(__dirname, 'dist/public/data/words');
          const distWordsPath = join(distWordsDir, 'word_by_word.json');
          
          if (existsSync(publicWordsPath)) {
            // Create directory if it doesn't exist
            if (!existsSync(distWordsDir)) {
              mkdirSync(distWordsDir, { recursive: true });
            }
            // Copy file to dist folder after build
            copyFileSync(publicWordsPath, distWordsPath);
            console.log('✅ word_by_word.json copied to dist/public/data/words/');
          }
        } catch (error) {
          console.warn('⚠️ Could not copy files to dist:', error);
        }
      }
    }
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'UmarAcademyMushaf',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
    copyPublicDir: true,
  },
  publicDir: 'public',
});

