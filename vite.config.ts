import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // [關鍵] 這裡必須是 '/您的專案名稱/'
  // 您的專案名稱是 seat-system，所以要是 '/seat-system/'
  base: '/seat-system/', 
})