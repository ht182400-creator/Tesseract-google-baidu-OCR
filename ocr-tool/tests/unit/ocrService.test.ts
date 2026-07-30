import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildArgs, sanitizeLang, sanitizeWhitelist, parseTsv } from '../../server/ocrService.js';
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

  it('输出 pdf 时用 -c tessedit_create_pdf=1（本机构建不支持裸 pdf 参数）', () => {
    const a = buildArgs('/in.png', '/out', '/tess', { ...BASE, outputFormat: 'pdf' });
    // 本机构建会把裸 `pdf` 当成参数文件读取报错，必须用 -c 显式开启
    expect(a).toContain('-c');
    expect(a).toContain('tessedit_create_pdf=1');
    expect(a).not.toContain('pdf');
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

describe('sanitizeWhitelist', () => {
  it('空字符串返回空', () => {
    expect(sanitizeWhitelist('')).toBe('');
  });

  it('允许字母数字空格与常见标点', () => {
    expect(sanitizeWhitelist('ABCD 0129.,-')).toBe('ABCD 0129.,-');
  });

  it('允许中日韩等 Unicode 文字', () => {
    expect(sanitizeWhitelist('车牌测试')).toBe('车牌测试');
  });

  it('含控制字符或非法符号抛错', () => {
    expect(() => sanitizeWhitelist('abc' + String.fromCharCode(7))).toThrow(); // 响铃控制字符
    expect(() => sanitizeWhitelist('a' + String.fromCharCode(0) + 'b')).toThrow(); // NUL 控制字符
  });

  it('超长白名单抛错', () => {
    expect(() => sanitizeWhitelist('a'.repeat(257))).toThrow(/上限/);
  });
});

describe('buildArgs - 白名单', () => {
  it('传 whitelist 时追加 tessedit_char_whitelist', () => {
    const params: OcrParams = { languages: ['eng'], oem: 1, psm: 6, preserveSpaces: false, outputFormat: 'txt', whitelist: '0123456789' };
    const args = buildArgs('in', 'out', '/tess', params);
    const idx = args.indexOf('-c');
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(args[idx + 1]).toBe('tessedit_char_whitelist=0123456789');
  });

  it('空 whitelist 不追加', () => {
    const params: OcrParams = { languages: ['eng'], oem: 1, psm: 6, preserveSpaces: false, outputFormat: 'txt', whitelist: '' };
    const args = buildArgs('in', 'out', '/tess', params);
    expect(args.some((a) => a.includes('tessedit_char_whitelist'))).toBe(false);
  });
});

describe('parseTsv', () => {
  const buildTsv = () => {
    const header = 'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext';
    const rows = [
      header,
      '1\t1\t0\t0\t0\t0\t0\t0\t0\t0\t-1\t',
      '2\t1\t1\t0\t0\t0\t0\t0\t0\t0\t-1\t',
      '4\t1\t1\t1\t1\t0\t10\t20\t200\t30\t-1\t',
      '5\t1\t1\t1\t1\t1\t10\t20\t50\t30\t95\thello',
      '5\t1\t1\t1\t1\t2\t70\t20\t60\t30\t90\tworld',
      '4\t1\t1\t1\t2\t0\t10\t60\t180\t30\t-1\t',
      '5\t1\t1\t1\t2\t1\t10\t60\t180\t30\t92\tsecond',
    ];
    return rows.join('\n');
  };

  it('解析为块/行/词并聚合包围盒', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tsv-')); // 清理在 finally
    const p = join(dir, 'x.tsv');
    writeFileSync(p, buildTsv(), 'utf-8');
    try {
      const blocks = parseTsv(p);
      expect(blocks.length).toBe(1);
      const block = blocks[0];
      expect(block.lines.length).toBe(2);
      const line1 = block.lines[0];
      expect(line1.words.length).toBe(2);
      expect(line1.text).toBe('hello world');
      expect(line1.left).toBe(10);
      expect(line1.top).toBe(20);
      expect(line1.width).toBe(120); // 70+60 - 10
      expect(line1.height).toBe(30);
      const line2 = block.lines[1];
      expect(line2.text).toBe('second');
      expect(line2.top).toBe(60);
      expect(block.text).toBe('hello world\nsecond');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('文件不存在时返回空数组（不抛错）', () => {
    expect(parseTsv('/nonexistent/path/to.tsv')).toEqual([]);
  });
});
