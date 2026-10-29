import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' keeps the build working when hosted from a subfolder (e.g. GitHub Pages).
export default defineConfig({
  plugins: [react()],
  base: './',
});
