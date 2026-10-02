import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  build: { outDir: 'dist', sourcemap: false },
  server: {
    port: 5173,
    proxy: {
      // Mismo origen en desarrollo: la cookie de sesión es SameSite=Strict y
      // Path=/web, así que una llamada directa a :7000 nunca la recibiría.
      '/web/api': {
        target: process.env.VITE_API_TARGET || 'http://127.0.0.1:7000',
        changeOrigin: false,
      },
    },
  },
  test: { environment: 'node' },
});
