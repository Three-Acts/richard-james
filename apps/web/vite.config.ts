import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const resolveSrc = (relativePath: string) => fileURLToPath(new URL(relativePath, import.meta.url));

export default defineConfig(({ mode, isSsrBuild }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiOrigin = env.API_ORIGIN;

  return {
    // The dev server (server.mjs) and prerender assemble HTML themselves, so
    // Vite does not own index.html routing.
    appType: "custom",
    plugins: [react(), tailwindcss()],
    build: {
      outDir: isSsrBuild ? "dist/server" : "dist/client",
      emptyOutDir: true,
      // Client build: emit a manifest and two entries (full SPA + island runtime).
      // The SSR build (--ssr) supplies its own entry, so skip these there.
      ...(isSsrBuild
        ? {}
        : {
            manifest: true,
            rollupOptions: {
              input: {
                "entry-client": resolveSrc("src/entry-client.tsx"),
                "islands-client": resolveSrc("src/islands-client.tsx")
              }
            }
          })
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
      // Bundle these for SSR so they resolve cleanly under pnpm (dev + build).
      noExternal: ["@base-ui-components/react", "@supabase/supabase-js"]
    }
  };
});
