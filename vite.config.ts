// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // ⚠️ 關鍵：這裡必須是您的 GitHub Repository 名稱，前後都要有斜線
  base: '/SeatingLayout/', 
})