import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Static SPA build. Everything in public/ is copied verbatim into dist/,
// which is the directory Cloudflare Pages publishes (see functions/_middleware.js
// and public/_headers for the embed-protection pair).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
