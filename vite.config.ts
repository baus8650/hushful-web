import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/v1': {
        target: 'https://wishlistapi-production-8565.up.railway.app',
        changeOrigin: true,
      },
    },
  },
})
