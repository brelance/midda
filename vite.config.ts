import { defineConfig } from "vite";
import path from "node:path";
import electron from "vite-plugin-electron/simple";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import dotenv from "dotenv";

// Load .env at config time so we can inject Supabase credentials at build time
dotenv.config();

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    electron({
      main: {
        // Shortcut of `build.lib.entry`.
        entry: "electron/main/main.ts",
        vite: {
          define: {
            __SUPABASE_URL__: JSON.stringify(process.env.SUPABASE_URL ?? ""),
            __SUPABASE_ANON_KEY__: JSON.stringify(process.env.SUPABASE_ANON_KEY ?? ""),
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
