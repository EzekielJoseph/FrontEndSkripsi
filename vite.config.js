import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const devApiTarget = process.env.VITE_DEV_API_TARGET ?? "http://127.0.0.1:8000";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: devApiTarget,
        changeOrigin: true
      }
    }
  }
});
