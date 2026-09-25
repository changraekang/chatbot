import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/rag": {
        target: "https://api.sparkling-rae.com",
        secure: true,
        changeOrigin: true,
      },
    },
  },
});
