import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { OcrParams, PageResult } from './types.js';
import type { AppConfig } from './configService.js';

/** 允许的语言代码字符集：仅字母数字下划线，杜绝任何 shell 注入 */
const LANG_PATTERN = /^[a-zA-Z0-9_]+$/;
/** 允许的 oem 取值 */
const VALID_OEM = new Set([0, 1, 2, 3]);
/** 允许的 psm 取值 0-13 */
const VALID_PSM = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);

/**
 * 校验并清洗单个语言代码，非法直接抛错。
 * 这是防命令注入的第一道关卡——绝不允许出现空格、分号、&、$ 等元字符。
 */
export function sanitizeLang(code: string): string {
  if (!LANG_PATTERN.test(code)) {
    throw new Error(`非法语言代码: ${code}（仅允许字母数字下划线）`);
  }
  return code;
}

/**
 * 拼装 tesseract 命令行参数（数组形式，非 shell 字符串，杜绝引号/插值问题）。
 * @returns 不含可执行文件名的参数数组
 */
export function buildArgs(
  inputPath: string,
  outputBase: string,
  tessdataDir: string,
  params: OcrParams
): string[] {
  if (!params.languages || params.languages.length === 0) {
    throw new Error('至少选择一种语言');
  }
  if (!VALID_OEM.has(params.oem)) {
    throw new Error(`非法 oem 取值: ${params.oem}（允许 0-3）`);
  }
  if (!VALID_PSM.has(params.psm)) {
    throw new Error(`非法 psm 取值: ${params.psm}（允许 0-13）`);
  }

  const lang = params.languages.map(sanitizeLang).join('+');
  const args = [
    inputPath,
    outputBase,
    '-l',
    lang,
    '--oem',
    String(params.oem),
    '--psm',
    String(params.psm),
  ];
  if (params.preserveSpaces) {
    args.push('-c', 'preserve_interword_spaces=1');
  }
  args.push('--tessdata-dir', tessdataDir);
  if (params.outputFormat === 'pdf') {
    args.push('pdf');
  }
  return args;
}

/** 识别被取消时抛出的错误（前端据此区分「取消」与「失败」） */
export class OcrAbortError extends Error {
  constructor() {
    super('识别已取消');
    this.name = 'OcrAbortError';
  }
}

/**
 * 识别单张图片，返回文本（及可选的可搜索 PDF 路径）。
 * @param signal 可选中止信号；触发后立即杀掉子进程并以 OcrAbortError 拒绝，
 *               用于前端「取消」与客户端断线（req close）时回收 tesseract 进程。
 */
export async function ocrImage(
  inputPath: string,
  outputBase: string,
  config: AppConfig,
  params: OcrParams,
  signal?: AbortSignal
): Promise<PageResult> {
  if (!existsSync(config.tesseractPath)) {
    throw new Error(`找不到 Tesseract 程序: ${config.tesseractPath}`);
  }
  if (!existsSync(config.tessdataDir)) {
    throw new Error(`语言包目录不存在: ${config.tessdataDir}`);
  }

  const args = buildArgs(inputPath, outputBase, config.tessdataDir, params);

  return new Promise<PageResult>((resolve, reject) => {
    let settled = false;
    // timer 必须先声明（供 finish 引用），但赋值在 finish/onAbort 定义之后
    let timer: ReturnType<typeof setTimeout> | undefined;
    const child = spawn(config.tesseractPath, args);
    let stderr = '';
    child.stderr.on('data', (d) => (stderr += d.toString()));

    /** 统一收尾：保证只 settle 一次、清理定时器与监听 */
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      fn();
    };

    timer = setTimeout(() => {
      finish(() => {
        child.kill('SIGKILL');
        reject(new Error(`OCR 超时（>${config.timeoutMs}ms），子进程已终止`));
      });
    }, config.timeoutMs);

    const onAbort = () => {
      finish(() => {
        child.kill('SIGKILL');
        reject(new OcrAbortError());
      });
    };
    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener('abort', onAbort);
    }

    child.on('error', (err) => {
      finish(() => reject(new Error(`启动 Tesseract 失败: ${err.message}`)));
    });

    child.on('close', (code) => {
      if (settled) return;
      finish(() => {
        if (code !== 0) {
          reject(new Error(`Tesseract 退出码 ${code}：${stderr || '无 stderr'}`));
          return;
        }
        try {
          const result: PageResult = { text: '' };
          if (params.outputFormat === 'pdf') {
            const pdfPath = `${outputBase}.pdf`;
            if (existsSync(pdfPath)) result.pdfUrl = pdfPath;
          } else {
            const txtPath = `${outputBase}.txt`;
            if (existsSync(txtPath)) result.text = readFileSync(txtPath, 'utf-8');
          }
          resolve(result);
        } catch (err) {
          reject(new Error(`读取识别结果失败: ${(err as Error).message}`));
        }
      });
    });
  });
}

/**
 * 探测 tesseract 版本（用于健康检查）。
 * 通过 `tesseract --version` 的非零退出捕获（tesseract 把版本打到 stderr）。
 */
export async function detectVersion(config: AppConfig): Promise<string> {
  return new Promise<string>((resolve) => {
    try {
      const child = spawn(config.tesseractPath, ['--version']);
      let out = '';
      child.stderr.on('data', (d) => (out += d.toString()));
      child.stdout.on('data', (d) => (out += d.toString()));
      child.on('close', () => resolve(out.split('\n')[0]?.trim() || 'unknown'));
      child.on('error', () => resolve('unavailable'));
    } catch {
      resolve('unavailable');
    }
  });
}

/** 公开给单测：把 pdf 文件名转为下载路由路径的辅助 */
export function pdfRoute(taskId: string, fileName: string): string {
  return `/api/static/${taskId}/${fileName}`;
}

/** 供 static 路由拼接实际文件路径 */
export function staticFilePath(taskId: string, fileName: string): string {
  const base = process.env.OCR_TMP_DIR || tmpdir();
  return join(base, 'ocr-tool', taskId, fileName);
}
