import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './public/Scripts/main.js',
      },
      output: {
        entryFileNames: 'Scripts/[name].js',
        chunkFileNames: 'Scripts/[name]-[hash].js',
        assetFileNames: 'Styles/[name]-[hash][extname]'
      }
    }
  },
  server: {
    middlewareMode: true
  }
})
