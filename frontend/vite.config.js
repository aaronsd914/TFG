import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      {
        find: '@testing-library/react',
        replacement: resolve(__dirname, 'node_modules/@testing-library/react'),
      },
      {
        find: 'react-router-dom',
        replacement: resolve(__dirname, 'node_modules/react-router-dom'),
      },
    ],
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test-setup.js',
    css: false,
    include: ['../test/frontend/**/*.test.{js,jsx}'],
    server: {
      fs: {
        allow: ['..'],
      },
      deps: {
        modulePaths: [resolve(__dirname, 'node_modules')],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx', 'src/config.js'],
    },
  },
})
