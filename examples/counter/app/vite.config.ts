import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
  },
  optimizeDeps: {
    include: ["core_types/bincode/mod", "core_types/core"],
  },
});
