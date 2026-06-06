import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
  },
  resolve: {
    alias: {
      "@core": resolve(__dirname, "src/core"),
      "@editor": resolve(__dirname, "src/editor"),
      "@viewer": resolve(__dirname, "src/viewer"),
      "@server": resolve(__dirname, "src/server"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        viewer: resolve(__dirname, "viewer.html"),
      },
    },
  },
  server: {
    port: 3000,
  },
});
