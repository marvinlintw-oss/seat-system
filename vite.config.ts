import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/SeatingLayout/', // <--- 請新增這一行，必須跟您的 GitHub 專案名稱一模一樣
})