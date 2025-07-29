import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    // Disable componentTagger in development to avoid CSP eval warnings
    // mode === 'development' &&
    // componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize build performance
    target: 'esnext',
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Enable code splitting for better caching
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-tabs', '@radix-ui/react-toast'],
          supabase: ['@supabase/supabase-js'],
          utils: ['clsx', 'class-variance-authority', 'tailwind-merge'],
        },
        // Optimize chunk naming
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Reduce bundle size
    chunkSizeWarningLimit: 1000,
    // Enable tree shaking
    treeshake: true,
  },
  optimizeDeps: {
    // Pre-bundle dependencies for faster dev server
    include: [
      'react',
      'react-dom',
      '@supabase/supabase-js',
      'lucide-react',
      'clsx',
      'class-variance-authority',
      'tailwind-merge',
    ],
    // Exclude problematic dependencies
    exclude: ['@radix-ui/react-dialog', '@radix-ui/react-tabs'],
  },
  // Improve development experience
  esbuild: {
    // Enable tree shaking in development
    treeShaking: true,
  },
}));
