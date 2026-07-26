import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  publicDir: 'public',
  base: '',
  build: {
    outDir: 'dist-iife',
    sourcemap: true,
    format: 'iife',
    rollupOptions: {
      input: 'index.html',
      output: {
        format: 'iife',
        entryFileNames: 'bundle.js'
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
})
