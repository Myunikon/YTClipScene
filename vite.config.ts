import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";


const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,



  // Build optimization
  build: {
    // Target modern browsers for smaller output
    target: 'es2020',
    // Disable source maps in production for smaller bundle
    sourcemap: false,
    // Minification with esbuild for fast, good compression
    minify: 'esbuild' as const,
    // esbuild minification options
    esbuild: {
      drop: ['console', 'debugger'],
      minifyIdentifiers: true,
      minifySyntax: true,
      minifyWhitespace: true,
    },
    // Manual chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // React core - rarely changes
          'vendor-react': ['react', 'react-dom'],
          // UI libraries - changes occasionally
          'vendor-ui': ['framer-motion', 'lucide-react', 'sonner'],
          // Tauri APIs - rarely changes
          'vendor-tauri': [
            '@tauri-apps/api',
            '@tauri-apps/plugin-shell',
            '@tauri-apps/plugin-fs',
            '@tauri-apps/plugin-dialog',
            '@tauri-apps/plugin-notification',
            '@tauri-apps/plugin-clipboard-manager',
          ],
          // State management
          'vendor-state': ['zustand'],
        },
      },
    },
    // Adjust warning threshold
    chunkSizeWarningLimit: 500,
  },

  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
        protocol: "ws",
        host,
        port: 1421,
      }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
