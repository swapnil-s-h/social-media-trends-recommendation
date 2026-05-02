import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Replace `global` references with `globalThis` at build time to
  // avoid runtime ReferenceError in browsers when libraries expect
  // a Node-like `global` variable.
  define: {
    global: "globalThis",
  },

  server: {
    proxy: {
      // This rule proxies any request that starts with '/api'
      "/api": {
        target: "http://localhost:4000", // Your backend server
        changeOrigin: true, // Recommended
        secure: false, // If your backend is not HTTPS
      },
    },
  },
});
