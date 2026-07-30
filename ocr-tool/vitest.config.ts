import { defineConfig } from 'vitest/config';

/**
 * Vitest 配置：仅跑单元 / 集成测试，排除 Playwright E2E（由 `npm run test:e2e` 单独执行）。
 */
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    environment: 'node',
    testTimeout: 90_000,
  },
});
