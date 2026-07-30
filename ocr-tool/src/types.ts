/** 前端共享类型（与 server/types.ts 保持结构一致，但此处用于 UI） */

export interface OcrParams {
  languages: string[];
  oem: number;
  psm: number;
  preserveSpaces: boolean;
  outputFormat: 'txt' | 'pdf';
}

export interface PageResult {
  text: string;
  pdfUrl?: string;
}

export interface OcrResponse {
  pages: PageResult[];
  combined: string;
}

export interface HealthResponse {
  ok: boolean;
  tesseractVersion: string;
  tesseractPath: string;
  tessdataDir: string;
  languages: string[];
}

/** 单个待处理文件在 UI 中的状态 */
export interface FileItem {
  id: string;
  name: string;
  kind: 'image' | 'pdf';
  /** 图片预览 dataURL 或 PDF 各页缩略图 dataURL 列表 */
  previews: string[];
  status: 'idle' | 'processing' | 'done' | 'error';
  /** OCR 后各页文本（PDF 多页） */
  pagesText: string[];
  /** 可搜索 PDF 下载地址（仅图片转 PDF 时存在） */
  pdfUrl?: string;
  error?: string;
}
