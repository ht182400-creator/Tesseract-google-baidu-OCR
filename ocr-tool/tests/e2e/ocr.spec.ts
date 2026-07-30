import { test, expect } from '@playwright/test';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIX = join(__dirname, '..', 'fixtures');

/**
 * E2E 全链路：真实浏览器拖入文件 → 点识别 → 断言结果非空。
 * 不走原生拖拽（不稳定），改用隐藏 file input 的 setInputFiles（react-dropzone 监听 change）。
 */
test.describe('OCR 工具端到端', () => {
  test('识别图片（phototest.tif）得到非空文本', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.app-header h1')).toBeVisible();

    // 等待后端就绪（语言列表加载）
    await expect(page.locator('.lang-chip').first()).toBeVisible({ timeout: 15000 });

    // 通过隐藏 input 选择图片
    await page.setInputFiles('input[type=file]', join(FIX, 'phototest.tif'));
    await expect(page.locator('.file-item').first()).toBeVisible();

    // 触发识别
    await page.getByRole('button', { name: '识别全部' }).click();

    // 结果区出现非空文本
    const text = page.locator('.result-text');
    await expect(text).toBeVisible({ timeout: 30000 });
    const content = await text.innerText();
    expect(content.trim().length).toBeGreaterThan(30);
  });

  test('识别 PDF（sample.pdf）得到分页结果', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.lang-chip').first()).toBeVisible({ timeout: 15000 });

    await page.setInputFiles('input[type=file]', join(FIX, 'sample.pdf'));
    // PDF 栅格化需要一点时间
    await expect(page.locator('.preview-card').first()).toBeVisible({ timeout: 20000 });

    await page.getByRole('button', { name: '识别全部' }).click();
    const text = page.locator('.result-text');
    await expect(text).toBeVisible({ timeout: 30000 });
    expect((await text.innerText()).trim().length).toBeGreaterThan(0);
  });

  test('拖入不支持格式显示红色拒绝', async ({ page }) => {
    await page.goto('/');
    // 创建一个临时 docx 夹具
    const fs = await import('node:fs');
    const bad = join(FIX, 'bad.docx');
    fs.writeFileSync(bad, Buffer.from('PK fake docx'));
    await page.setInputFiles('input[type=file]', bad);
    await expect(page.locator('.global-err, .err-box').first()).toBeVisible({ timeout: 10000 });
    fs.unlinkSync(bad);
  });
});
