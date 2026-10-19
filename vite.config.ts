/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const { name, version } = JSON.parse(
  readFileSync('./package.json', 'utf-8'),
) as {
  name: string
  version: string
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.URL_BASE_PATH || '/',
  plugins: [react()],
  define: {
    __APP_NAME__: JSON.stringify(name),
    __APP_VERSION__: JSON.stringify(version),
    __NPM_LIFECYCLE_EVENT__: JSON.stringify(process.env.npm_lifecycle_event),
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    css: true,
  },
})
