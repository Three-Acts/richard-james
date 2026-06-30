import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiOrigin = env.API_ORIGIN;

  return {
    plugins: [react(), tailwindcss()],
    build: {
      outDir: "dist/client",
      emptyOutDir: true
    },
    server: apiOrigin
      ? {
          proxy: {
            "/api": {
              target: apiOrigin,
              changeOrigin: true
            }
          }
        }
      : undefined,
    ssr: {
      noExternal: ["@base-ui-components/react"]
    }
  };
});
