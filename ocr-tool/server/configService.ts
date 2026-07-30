import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LanguageInfo } from './types.js';

/**
 * 默认配置：指向本仓库已构建的 tesseract 与已克隆的测试语言包。
 * 首次启动若检测不到配置文件则写入默认值；用户可在设置页修改。
 */
const DEFAULT_TESSERACT_PATH =
  'D:\\Work_Area\\AI\\tesseract\\.sw\\out\\154291\\google.tesseract.tesseract-main.exe';
const DEFAULT_TESSDATA_DIR = 'D:\\Work_Area\\AI\\tesseract\\tessdata_unittest\\tessdata';

export interface AppConfig {
  tesseractPath: string;
  tessdataDir: string;
  /** 单任务 OCR 超时（毫秒） */
  timeoutMs: number;
  /** 允许上传的最大单文件字节数 */
  maxFileBytes: number;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, '..', 'ocr-tool.config.json');

const DEFAULT_CONFIG: AppConfig = {
  tesseractPath: DEFAULT_TESSERACT_PATH,
  tessdataDir: DEFAULT_TESSDATA_DIR,
  timeoutMs: 60_000,
  maxFileBytes: 50 * 1024 * 1024,
};

/** 读取配置；文件不存在时写入默认配置 */
export function loadConfig(): AppConfig {
  try {
    if (existsSync(CONFIG_PATH)) {
      const raw = readFileSync(CONFIG_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<AppConfig>;
      return { ...DEFAULT_CONFIG, ...parsed };
    }
    writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
    return { ...DEFAULT_CONFIG };
  } catch (err) {
    console.error('加载配置失败，回退默认配置:', err);
    return { ...DEFAULT_CONFIG };
  }
}

/** 覆盖写入配置（供未来设置页使用） */
export function saveConfig(patch: Partial<AppConfig>): AppConfig {
  const next = { ...loadConfig(), ...patch };
  writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), 'utf-8');
  return next;
}

/**
 * 扫描 tessdata 目录，列出所有可用语言包（.traineddata）。
 * 目录不存在或读取失败时返回空数组，不会抛异常。
 */
export function listLanguages(tessdataDir: string): LanguageInfo[] {
  try {
    if (!existsSync(tessdataDir)) return [];
    return readdirSync(tessdataDir)
      .filter((f) => f.endsWith('.traineddata'))
      .map((f) => ({ code: f.replace(/\.traineddata$/, ''), path: join(tessdataDir, f) }))
      .filter((info) => statSync(info.path).isFile());
  } catch (err) {
    console.error('扫描语言包失败:', err);
    return [];
  }
}
