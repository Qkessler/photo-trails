import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@core": resolve(__dirname, "src/core"),
      "@editor": resolve(__dirname, "src/editor"),
      "@viewer": resolve(__dirname, "src/viewer"),
      "@server": resolve(__dirname, "src/server"),
    },
  },
  server: {
    port: 3000,
  },
});
