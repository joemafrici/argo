import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
  },
  server: {
    host: "0.0.0.0",
    port: 8080,
  },
})
