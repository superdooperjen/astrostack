import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Ensures relative assets work on GitHub Pages
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});
