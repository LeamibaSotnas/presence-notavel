import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
    },
  },

  root: path.resolve(import.meta.dirname, "client"),
  envDir: import.meta.dirname,

  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    sourcemap: false,
  },

  server: {
    port: 3000,
    strictPort: false,
    host: true,
  },

  preview: {
    port: 4173,
    host: true,
  },
});
