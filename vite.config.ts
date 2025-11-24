import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Để code cũ dùng process.env.API_KEY hoạt động được trên Vite
    'process.env': process.env
  }
})