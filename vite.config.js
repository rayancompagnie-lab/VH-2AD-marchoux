import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  },
  // Assure que le service worker et le manifest sont bien servis en production
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})