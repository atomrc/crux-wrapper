import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      name: "crux-wrapper",
    },
  },
});
