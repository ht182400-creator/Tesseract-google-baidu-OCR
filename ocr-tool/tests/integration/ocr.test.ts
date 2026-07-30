import { describe, it, expect } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ocrImage, detectVersion } from '../../server/ocrService.js';
import type { AppConfig } from '../../server/configService.js';
import type { OcrParams } from '../../server/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIX = join(__dirname, '..', 'fixtures');

// 真实环境路径（与 configService 默认一致）
const REAL: AppConfig = {
  tesseractPath: 'D:\\Work_Area\\AI\\tesseract\\.sw\\out\\154291\\google.tesseract.tesseract-main.exe',
  tessdataDir: 'D:\\Work_Area\\AI\\tesseract\\tessdata_unittest\\tessdata',
  timeoutMs: 60_000,
  maxFileBytes: 50 * 1024 * 1024,
};

const PARAMS: OcrParams = { languages: ['eng'], oem: 1, psm: 6, preserveSpaces: false, outputFormat: 'txt' };

describe('集成：真实 tesseract', () => {
  it('版本探测可用', async () => {
    const v = await detectVersion(REAL);
    expect(v).not.toBe('unavailable');
  });

  it('识别 phototest.tif 返回非空文本且含已知片段', async () => {
    const input = join(FIX, 'phototest.tif');
    const out = join(FIX, 'phototest_out');
    const res = await ocrImage(input, out, REAL, PARAMS);
    expect(res.text.length).toBeGreaterThan(50);
    expect(res.text).toMatch(/This|point|12/i);
  });

  it('错误的 tessdataDir 抛错', async () => {
    const bad = { ...REAL, tessdataDir: 'C:\\no\\such\\dir' };
    await expect(ocrImage(join(FIX, 'phototest.tif'), join(FIX, 'x'), bad, PARAMS)).rejects.toThrow('语言包目录');
  });

  it('错误的 tesseractPath 抛错', async () => {
    const bad = { ...REAL, tesseractPath: 'C:\\no\\such\\tesseract.exe' };
    await expect(ocrImage(join(FIX, 'phototest.tif'), join(FIX, 'x'), bad, PARAMS)).rejects.toThrow('找不到');
  });

  it('取消：中止信号触发后子进程被终止并以 OcrAbortError 拒绝', async () => {
    const { OcrAbortError } = await import('../../server/ocrService.js');
    const ac = new AbortController();
    const p = ocrImage(join(FIX, 'phototest.tif'), join(FIX, 'cancel_out'), REAL, PARAMS, ac.signal);
    // 立即中止，模拟用户点击「取消」
    ac.abort();
    await expect(p).rejects.toThrow(OcrAbortError);
  });
});
