import { defineConfig } from "vite";
import path from "node:path";
import electron from "vite-plugin-electron/simple";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import dotenv from "dotenv";

// Backend URL is public configuration; JWTs are acquired only at runtime.
dotenv.config();

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/community-api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (url) => url.replace(/^\/community-api/, ''),
      },
    },
  },
  define: {
    'import.meta.env.VITE_COMMUNITY_API_URL': JSON.stringify(process.env.MIDDA_API_URL || process.env.VITE_COMMUNITY_API_URL || ''),
  },
  plugins: [
    react(),
    tailwindcss(),
    electron({
      main: {
        // Shortcut of `build.lib.entry`.
        entry: "electron/main/main.ts",
        vite: {
          define: {
            __MIDDA_API_URL__: JSON.stringify(process.env.MIDDA_API_URL || (process.env.VITE_COMMUNITY_API_URL === '/community-api' ? 'http://localhost:8080' : process.env.VITE_COMMUNITY_API_URL) || ''),
          },
          build: {
            rollupOptions: {
              external: ["better-sqlite3", "dotenv", "undici", "say", "adm-zip"],
            },
          },
        },
        onstart(options) {
          options.startup();
        },
      },
      preload: {
        // Shortcut of `build.rollupOptions.input`.
        // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
        input: path.join(__dirname, "electron/preload.ts"),
      },
      // Ployfill the Electron and Node.js API for Renderer process.
      // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
      // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
      // Renderer plugin is optional since we expose APIs through preload.
      renderer: undefined,
    }),
  ],
});
