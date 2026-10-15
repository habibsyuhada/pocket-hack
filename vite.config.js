import { defineConfig } from 'vite';

// On GitHub Pages this ships to https://<user>.github.io/pocket-hack/,
// so assets need the repo path as base. Dev stays at root.
export default defineConfig(({ command }) => ({
  root: './src',
  publicDir: '../public',
  base: command === 'build' ? '/pocket-hack/' : '/',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  server: {
    port: 3000,
    host: true
  }
}));
