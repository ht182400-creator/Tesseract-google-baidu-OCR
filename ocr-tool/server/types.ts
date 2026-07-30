/**
 * 服务端共享类型定义
 */

/** 前端提交的 OCR 参数 */
export interface OcrParams {
  /** 语言代码列表，如 ['eng', 'chi_tra'] */
  languages: string[];
  /** OCR 引擎模式：0=传统 1=LSTM 2=两者 3=默认 */
  oem: number;
  /** 页面分割模式 0-13 */
  psm: number;
  /** 是否保留词间空格 */
  preserveSpaces: boolean;
  /** 输出格式：纯文本 或 可搜索 PDF */
  outputFormat: 'txt' | 'pdf';
}

/** 单页 OCR 结果 */
export interface PageResult {
  /** 该页识别文本 */
  text: string;
  /** 可搜索 PDF 下载地址（仅 outputFormat=pdf 时存在） */
  pdfUrl?: string;
}

/** 整次 OCR 响应 */
export interface OcrResponse {
  /** 按页码拆分的明细 */
  pages: PageResult[];
  /** 所有页拼接文本 */
  combined: string;
}

/** 可用语言项 */
export interface LanguageInfo {
  code: string;
  path: string;
}

/** 健康检查响应 */
export interface HealthResponse {
  ok: boolean;
  tesseractVersion: string;
  tesseractPath: string;
  tessdataDir: string;
  languages: string[];
}
