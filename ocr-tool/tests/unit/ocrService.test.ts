import { describe, it, expect } from 'vitest';
import { buildArgs, sanitizeLang } from '../../server/ocrService.js';
import type { OcrParams } from '../../server/types.js';

const BASE: OcrParams = {
  languages: ['eng'],
  oem: 1,
  psm: 6,
  preserveSpaces: false,
  outputFormat: 'txt',
};

describe('sanitizeLang', () => {
  it('允许字母数字下划线', () => {
    expect(sanitizeLang('eng')).toBe('eng');
    expect(sanitizeLang('chi_tra')).toBe('chi_tra');
  });
  it('拒绝含注入字符的代码', () => {
    expect(() => sanitizeLang('eng;rm -rf')).toThrow();
    expect(() => sanitizeLang('a b')).toThrow();
    expect(() => sanitizeLang('eng$')).toThrow();
  });
});

describe('buildArgs', () => {
  it('最小参数包含 -l eng --oem 1 --psm 6', () => {
    const a = buildArgs('/in.png', '/out', '/tess', BASE);
    expect(a).toContain('-l');
    expect(a).toContain('eng');
    expect(a).toContain('--oem');
    expect(a).toContain('1');
    expect(a).toContain('--psm');
    expect(a).toContain('6');
    expect(a).toContain('--tessdata-dir');
    expect(a).toContain('/tess');
  });

  it('多语言用 + 连接', () => {
    const a = buildArgs('/in.png', '/out', '/tess', { ...BASE, languages: ['eng', 'chi_tra'] });
    const i = a.indexOf('-l');
    expect(a[i + 1]).toBe('eng+chi_tra');
  });

  it('保留空格添加 -c preserve_interword_spaces=1', () => {
    const a = buildArgs('/in.png', '/out', '/tess', { ...BASE, preserveSpaces: true });
    expect(a).toContain('-c');
    expect(a).toContain('preserve_interword_spaces=1');
  });

  it('输出 pdf 时末参为 pdf', () => {
    const a = buildArgs('/in.png', '/out', '/tess', { ...BASE, outputFormat: 'pdf' });
    expect(a[a.length - 1]).toBe('pdf');
  });

  it('空语言抛错', () => {
    expect(() => buildArgs('/in.png', '/out', '/tess', { ...BASE, languages: [] })).toThrow('至少');
  });

  it('非法 oem/psm 抛错', () => {
    expect(() => buildArgs('/in.png', '/out', '/tess', { ...BASE, oem: 9 })).toThrow('oem');
    expect(() => buildArgs('/in.png', '/out', '/tess', { ...BASE, psm: 99 })).toThrow('psm');
  });

  it('注入语言被清洗拒绝', () => {
    expect(() => buildArgs('/in.png', '/out', '/tess', { ...BASE, languages: ['eng', 'x;cat'] })).toThrow();
  });
});
