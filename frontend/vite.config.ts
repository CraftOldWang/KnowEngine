import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    port: 5173,
    strictPort: true,
    proxy: Object.fromEntries(
      ["/api", "/chat", "/eval"].map((p) => [
        p,
        { target: "http://127.0.0.1:8009", changeOrigin: true },
      ]),
    ),
  },
  build: { outDir: "dist" },
});
