import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    manifest: true,
    rolldownOptions: {
      output: {
        codeSplitting: {
          includeDependenciesRecursively: false,
          groups: [
            {
              name: "react-vendor",
              test: /node_modules\/(?:react|react-dom|react-router|scheduler)\//,
            },
            {
              name: "ui-vendor",
              test: /node_modules/,
            },
          ],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
