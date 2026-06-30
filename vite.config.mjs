import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // legacy deps (e.g. react-popup) rely on Node builtins like `events`,
    // which the browser/Vite don't provide out of the box (CRA/webpack did)
    nodePolyfills()
  ],
  server: {
    port: 3000 // keep localhost:3000 to match the Auth0 callback URLs
  },
  build: {
    outDir: 'build' // matches the existing `rsync build/ ...` deploy target
  },
  css: {
    preprocessorOptions: {
      // use Dart Sass's modern compiler API (no legacy-js-api deprecation)
      scss: { api: 'modern-compiler' }
    }
  }
})
