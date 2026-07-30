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
  /** 字符白名单（限定输出字符集），为空表示不限制。用于发票号/车牌/验证码等场景提升准确率 */
  whitelist?: string;
}

/** 单个识别词（含在源图中的像素级包围盒与置信度） */
export interface OcrWord {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
  conf: number;
}

/** 文本行（由若干词聚合，包围盒覆盖整行） */
export interface OcrLine {
  left: number;
  top: number;
  width: number;
  height: number;
  conf: number;
  text: string;
  words: OcrWord[];
}

/** 文本块（由若干行聚合，对应页面上的段落/区域） */
export interface OcrBlock {
  left: number;
  top: number;
  width: number;
  height: number;
  text: string;
  lines: OcrLine[];
}

/** 单页 OCR 结果 */
export interface PageResult {
  /** 该页识别文本 */
  text: string;
  /** 可搜索 PDF 下载地址（仅 outputFormat=pdf 时存在） */
  pdfUrl?: string;
  /** 带位置信息的结构化结果（用于前端「原图位置对应」视图），任意模式下都会返回 */
  blocks?: OcrBlock[];
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
