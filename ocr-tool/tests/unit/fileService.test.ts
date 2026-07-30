import { describe, it, expect } from 'vitest';
import { validateUpload } from '../../server/fileService.js';
import type { AppConfig } from '../../server/configService.js';

const CONFIG: AppConfig = {
  tesseractPath: 'x',
  tessdataDir: 'y',
  timeoutMs: 60_000,
  maxFileBytes: 10 * 1024 * 1024,
};

describe('validateUpload', () => {
  it('正常 png 通过', () => {
    expect(validateUpload('a.png', 2048, CONFIG)).toBe('png');
  });
  it('tif 也允许', () => {
    expect(validateUpload('scan.tif', 1024, CONFIG)).toBe('tif');
  });
  it('0 字节拒绝', () => {
    expect(() => validateUpload('a.png', 0, CONFIG)).toThrow('为空');
  });
  it('不支持格式拒绝', () => {
    expect(() => validateUpload('a.docx', 1024, CONFIG)).toThrow('不支持');
  });
  it('超大文件拒绝', () => {
    expect(() => validateUpload('big.png', 20 * 1024 * 1024, CONFIG)).toThrow('过大');
  });
});
