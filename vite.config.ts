import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // <--- Importante

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // <--- Esto conecta @ con src
    },
  },
})