import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { OcrParams, PageResult, OcrBlock, OcrLine, OcrWord } from './types.js';
import type { AppConfig } from './configService.js';

/** 允许的语言代码字符集：仅字母数字下划线，杜绝任何 shell 注入 */
const LANG_PATTERN = /^[a-zA-Z0-9_]+$/;
/** 允许的 oem 取值 */
const VALID_OEM = new Set([0, 1, 2, 3]);
/** 允许的 psm 取值 0-13 */
const VALID_PSM = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
/** 白名单字符上限，防止超长参数拖慢 tesseract 或被误用 */
const WHITELIST_MAX_LEN = 256;

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
 * 校验字符白名单：仅允许可见 ASCII（含空格、标点）、中日韩及通用字母/数字。
 * 由于参数通过 spawn 数组传递（非 shell），已无 shell 注入风险；此处限制字符集
 * 是为了避免 tesseract 解析异常，并兜底任何控制字符。
 */
export function sanitizeWhitelist(value: string): string {
  if (!value) return '';
  if (value.length > WHITELIST_MAX_LEN) {
    throw new Error(`白名单过长（上限 ${WHITELIST_MAX_LEN} 字符）`);
  }
  for (const ch of value) {
    const cp = ch.codePointAt(0) as number;
    const isPrintableAscii = cp >= 0x20 && cp <= 0x7e;
    const isLetter = /\p{L}/u.test(ch);
    const isNumber = /\p{N}/u.test(ch);
    if (!(isPrintableAscii || isLetter || isNumber)) {
      throw new Error('白名单含非法字符（仅支持字母、数字、空格、常见标点与 Unicode 文字）');
    }
  }
  return value;
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
  if (params.whitelist) {
    const wl = sanitizeWhitelist(params.whitelist);
    if (wl) args.push('-c', `tessedit_char_whitelist=${wl}`);
  }
  args.push('--tessdata-dir', tessdataDir);
  if (params.outputFormat === 'pdf') {
    args.push('pdf');
  }
  return args;
}

/**
 * 解析 tesseract TSV 输出为结构化 blocks/lines/words（含像素级包围盒）。
 * TSV 表头含 level/block_num/par_num/line_num/word_num/left/top/width/height/conf/text，
 * level=4 为行、level=5 为词。本函数按 (block,par,line) 聚合词成行、再聚合行成块，
 * 包围盒取所有子元素的并集，供前端「原图位置对应」视图使用。
 * @returns 块数组（保持出现顺序）；空 TSV 返回空数组
 */
export function parseTsv(tsvPath: string): OcrBlock[] {
  if (!existsSync(tsvPath)) return [];
  const raw = readFileSync(tsvPath, 'utf-8');
  const lines = raw.split('\n').filter((l) => l.length > 0);
  if (lines.length < 2) return [];

  const header = lines[0].split('\t');
  const col = (name: string) => header.indexOf(name);
  const iLevel = col('level');
  const iBlock = col('block_num');
  const iPar = col('par_num');
  const iLine = col('line_num');
  const iLeft = col('left');
  const iTop = col('top');
  const iW = col('width');
  const iH = col('height');
  const iConf = col('conf');
  const iText = col('text');
  if (iLevel < 0 || iLeft < 0) return []; // 表头异常，不阻断主流程

  const num = (s: string, d = 0): number => {
    const v = Number(s);
    return Number.isFinite(v) ? v : d;
  };

  /** 扩展并集包围盒 */
  const union = (
    b: { left: number; top: number; width: number; height: number },
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    const left = Math.min(b.left, x);
    const top = Math.min(b.top, y);
    const right = Math.max(b.left + b.width, x + w);
    const bottom = Math.max(b.top + b.height, y + h);
    b.left = left;
    b.top = top;
    b.width = right - left;
    b.height = bottom - top;
  };

  const blocks = new Map<string, OcrBlock>();
  const linesMap = new Map<string, OcrLine>();

  for (let n = 1; n < lines.length; n++) {
    const c = lines[n].split('\t');
    const level = num(c[iLevel]);
    const blockNum = c[iBlock] || '0';
    const parNum = c[iPar] || '0';
    const lineNum = c[iLine] || '0';
    const left = num(c[iLeft]);
    const top = num(c[iTop]);
    const width = num(c[iW]);
    const height = num(c[iH]);
    const conf = num(c[iConf]);

    if (level === 5) {
      const word: OcrWord = {
        text: c[iText] || '',
        left,
        top,
        width,
        height,
        conf,
      };
      const lineKey = `${blockNum}.${parNum}.${lineNum}`;
      let line = linesMap.get(lineKey);
      if (!line) {
        line = {
          left,
          top,
          width,
          height,
          conf,
          text: '',
          words: [],
        };
        linesMap.set(lineKey, line);
      }
      line.words.push(word);
      line.text += (line.text ? ' ' : '') + word.text;
      union(line, left, top, width, height);
      line.conf = line.words.reduce((s, w) => s + w.conf, 0) / line.words.length;

      const blockKey = `${blockNum}`;
      let block = blocks.get(blockKey);
      if (!block) {
        block = { left, top, width, height, text: '', lines: [] };
        blocks.set(blockKey, block);
      }
      union(block, left, top, width, height);
    }
  }

  // 把行挂到对应块，并生成块文本
  for (const [lineKey, line] of linesMap) {
    const blockNum = lineKey.split('.')[0];
    const block = blocks.get(blockNum);
    if (block) {
      block.lines.push(line);
      block.text += (block.text ? '\n' : '') + line.text;
    }
  }

  // 行按 top 排序，保证阅读顺序；块按首个行 top 排序
  for (const block of blocks.values()) {
    block.lines.sort((a, b) => a.top - b.top || a.left - b.left);
  }
  return [...blocks.values()].sort(
    (a, b) => Math.min(...a.lines.map((l) => l.top)) - Math.min(...b.lines.map((l) => l.top))
  );
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
  // 始终额外输出 tsv（含每个词/行的像素级包围盒），供前端位置对应视图使用；
  // tesseract 支持多输出格式（如 `... txt tsv` 或 `... pdf tsv`）
  args.push('tsv');

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
          // 解析 tsv（始终输出），失败不阻断主流程，仅降级为纯文本
          try {
            result.blocks = parseTsv(`${outputBase}.tsv`);
          } catch (tsvErr) {
            result.blocks = undefined;
            console.error('TSV 解析失败，已降级为纯文本:', tsvErr);
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
