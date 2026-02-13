import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  resolve: {
    alias: {
      // Mock mermaid since it's loaded at runtime from CDN
      mermaid: path.resolve(__dirname, 'src/utils/__mocks__/mermaid.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/utils/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts', 'src/**/__mocks__/**'],
      thresholds: {
        statements: 80,
        branches: 79, // Slightly lower due to localStorage branches untestable in jsdom
        functions: 80,
        lines: 80,
      },
    },
  },
});
