/** 前端共享类型（与 server/types.ts 保持结构一致，但此处用于 UI） */

export interface OcrParams {
  languages: string[];
  oem: number;
  psm: number;
  preserveSpaces: boolean;
  outputFormat: OutputFormat;
  /** 字符白名单（限定输出字符集），空字符串表示不限制 */
  whitelist: string;
  /** 图像预处理模式（仅前端生效，用于提升识别率） */
  preprocess: PreprocessMode;
}

/** 输出格式 */
export type OutputFormat = 'txt' | 'pdf';

/** 图像预处理模式 */
export type PreprocessMode = 'none' | 'grayscale' | 'binarize' | 'enhance';

export interface OcrWord {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
  conf: number;
}

export interface OcrLine {
  left: number;
  top: number;
  width: number;
  height: number;
  conf: number;
  text: string;
  words: OcrWord[];
}

export interface OcrBlock {
  left: number;
  top: number;
  width: number;
  height: number;
  text: string;
  lines: OcrLine[];
}

export interface PageResult {
  text: string;
  pdfUrl?: string;
  /** 带位置信息的结构化结果，用于「原图位置对应」视图 */
  blocks?: OcrBlock[];
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
  /** OCR 后各页结构化结果（含位置包围盒，用于「原图位置对应」视图） */
  pagesBlocks: OcrBlock[][];
  /** 可搜索 PDF 下载地址（仅图片转 PDF 时存在） */
  pdfUrl?: string;
  error?: string;
}
