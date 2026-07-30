import { Router, type Response } from 'express';
import multer from 'multer';
import { loadConfig, listLanguages } from '../configService.js';
import { ocrImage, detectVersion } from '../ocrService.js';
import {
  validateUpload,
  ensureTaskDir,
  saveUpload,
  cleanupTask,
  isReadableFile,
} from '../fileService.js';
import type { OcrParams, OcrResponse, HealthResponse } from '../types.js';
import { staticFilePath } from '../ocrService.js';
import { existsSync } from 'node:fs';
import { basename } from 'node:path';

/**
 * 内存存储：上传文件不落盘到 multer 默认目录，改为在路由内写入任务临时目录，
 * 便于与 tesseract 输出同目录、结束统一清理。
 */
const upload = multer({ storage: multer.memoryStorage(), limits: { files: 100 } });

function parseParams(raw: unknown): OcrParams {
  const obj = typeof raw === 'string' ? JSON.parse(raw) : (raw as Record<string, unknown>);
  const languages = Array.isArray(obj.languages) ? (obj.languages as string[]) : [];
  return {
    languages,
    oem: Number(obj.oem ?? 1),
    psm: Number(obj.psm ?? 6),
    preserveSpaces: Boolean(obj.preserveSpaces ?? false),
    outputFormat: obj.outputFormat === 'pdf' ? 'pdf' : 'txt',
  };
}

export const ocrRouter = Router();

/** 健康检查 + 语言列表 */
ocrRouter.get('/health', async (_req, res: Response<HealthResponse>) => {
  const config = loadConfig();
  const version = await detectVersion(config);
  const langs = listLanguages(config.tessdataDir).map((l) => l.code);
  res.json({
    ok: version !== 'unavailable',
    tesseractVersion: version,
    tesseractPath: config.tesseractPath,
    tessdataDir: config.tessdataDir,
    languages: langs,
  });
});

/** 可用语言列表 */
ocrRouter.get('/languages', (_req, res) => {
  const config = loadConfig();
  res.json(listLanguages(config.tessdataDir).map((l) => l.code));
});

/** 核心 OCR：接收多张图片（PDF 已在浏览器栅格化），逐页识别并拼接 */
ocrRouter.post('/ocr', upload.array('files', 100), async (req, res) => {
  const config = loadConfig();
  const dir = ensureTaskDir();
  // 客户端断线（取消/关闭页面）或显式 abort 时，杀掉正在运行的 tesseract 子进程。
  // 注意：必须用 res 的 close 且判断 writableEnded，否则请求体读完（keep-alive）即触发误杀。
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) controller.abort();
  });
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length === 0) {
      return res.status(400).json({ error: '未收到任何文件' });
    }
    let params: OcrParams;
    try {
      params = parseParams(req.body.params);
    } catch {
      return res.status(400).json({ error: '参数解析失败' });
    }

    const pages = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = validateUpload(f.originalname, f.size, config);
      const inputPath = saveUpload(dir, i, ext, f.buffer);
      const outputBase = inputPath.replace(/\.[^.]+$/, '');
      const pageResult = await ocrImage(inputPath, outputBase, config, params, controller.signal);
      if (pageResult.pdfUrl) {
        const fileName = basename(pageResult.pdfUrl);
        pageResult.pdfUrl = `/api/static/${basename(dir)}/${fileName}`;
      }
      pages.push(pageResult);
    }

    const response: OcrResponse = {
      pages,
      combined: pages.map((p) => p.text).join('\n\n'),
    };

    // 仅在纯文本模式清理临时目录（pdf 模式需保留供下载）
    if (params.outputFormat !== 'pdf') cleanupTask(dir);
    return res.json(response);
  } catch (err) {
    cleanupTask(dir);
    // 客户端已断开（取消）则无需再写响应，避免 Socket 已销毁报错
    if (controller.signal.aborted) return;
    const msg = (err as Error).message || '未知错误';
    const status = /找不到|不存在|非法|至少|不支持|过大|为空/.test(msg) ? 400 : 500;
    if (!res.headersSent) return res.status(status).json({ error: msg });
  }
});

/** 提供生成的可搜索 PDF 下载 */
ocrRouter.get('/static/:taskId/:file', (req, res) => {
  const { taskId, file } = req.params;
  // 仅允许基础文件名，阻断路径穿越
  if (!/^[\w.\-]+$/.test(file) || /\.\./.test(file)) {
    return res.status(400).json({ error: '非法文件名' });
  }
  const full = staticFilePath(taskId, file);
  if (!existsSync(full) || !isReadableFile(full)) {
    return res.status(404).json({ error: '文件不存在或已过期' });
  }
  res.download(full);
});
