import { mkdtempSync, mkdirSync, rmSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import type { AppConfig } from './configService.js';

/** 允许上传的扩展名（图片由浏览器转 PNG 后上传；PDF 在浏览器内栅格化，不会上传） */
const ALLOWED_EXT = new Set(['png', 'jpg', 'jpeg', 'bmp', 'tif', 'tiff', 'gif', 'webp']);

/**
 * 校验上传文件：扩展名 + 大小。
 * 返回清洗后的小写扩展名，非法则抛错（含友好信息）。
 */
export function validateUpload(originalName: string, size: number, config: AppConfig): string {
  const ext = originalName.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error(`不支持的格式: .${ext}（仅支持图片，PDF 请直接拖入，将自动栅格化）`);
  }
  if (size === 0) {
    throw new Error('文件为空（0 字节）');
  }
  if (size > config.maxFileBytes) {
    const mb = Math.round(config.maxFileBytes / 1024 / 1024);
    throw new Error(`文件过大（>${mb}MB），已拒绝`);
  }
  return ext;
}

/** 为一次任务创建隔离临时目录，返回绝对路径 */
export function ensureTaskDir(): string {
  const base = process.env.OCR_TMP_DIR || tmpdir();
  const root = join(base, 'ocr-tool');
  // mkdtempSync 仅创建末级目录，需确保父目录存在
  if (!existsSync(root)) mkdirSync(root, { recursive: true });
  return mkdtempSync(join(root, `task-${randomUUID()}-`));
}

/** 把上传的 buffer 写入临时目录，返回文件路径 */
export function saveUpload(dir: string, index: number, ext: string, buffer: Buffer): string {
  const path = join(dir, `page-${index}.${ext}`);
  writeFileSync(path, buffer);
  return path;
}

/** 清理任务临时目录（忽略错误，避免影响主流程） */
export function cleanupTask(dir: string): void {
  try {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  } catch (err) {
    console.error('清理临时目录失败:', err);
  }
}

/** 检查 PDF 是否真实可读（防止上传伪装文件） */
export function isPdf(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString('latin1') === '%PDF-';
}

/** 给定路径是否看似有效文件 */
export function isReadableFile(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).isFile();
  } catch {
    return false;
  }
}
