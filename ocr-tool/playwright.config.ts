import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 配置：
 * - 启动本地 dev server（Vite :5173 代理到 Express :3001）
 * - 使用 Chromium 真实浏览器跑拖拽 + 识别全链路
 * - 测试产物（报告、 traces）落在 playwright-report / test-results
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
