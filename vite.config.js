import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Run `netlify dev` alongside `npm run dev` to test saves locally.
      "/.netlify/functions": { target: "http://localhost:8888", changeOrigin: true },
    },
  },
})
