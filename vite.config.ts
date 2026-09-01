import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  // Absolute, not './'. With a relative base the browser resolves
  // ./assets/index.js against the current directory, so at /admin/batches it
  // asks for /admin/assets/index.js -- which `serve -s` answers with index.html,
  // and the page dies trying to parse HTML as JavaScript. Every nested route
  // depends on this being "/".
  base: '/',
  plugins: [inspectAttr(), react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
