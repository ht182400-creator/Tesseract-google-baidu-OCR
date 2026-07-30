import { useStore } from '../store';
import type { PreprocessMode } from '../types';

const OEM_OPTIONS = [
  { value: 1, label: '1 - 仅 LSTM（推荐）' },
  { value: 0, label: '0 - 传统引擎' },
  { value: 2, label: '2 - LSTM + 传统' },
  { value: 3, label: '3 - 默认' },
];

/** 页面分割模式（PSM）全部取值 0-13：选错是识别率低的主因之一 */
const PSM_OPTIONS = [
  { value: 0, label: '0 - 仅定向/脚本检测（OSD）' },
  { value: 1, label: '1 - 带 OSD 自动分割' },
  { value: 2, label: '2 - 自动分割（无 OSD）' },
  { value: 3, label: '3 - 全自动（默认）' },
  { value: 4, label: '4 - 单列可变大小' },
  { value: 5, label: '5 - 垂直单列' },
  { value: 6, label: '6 - 整页统一块' },
  { value: 7, label: '7 - 单行文本' },
  { value: 8, label: '8 - 单个词' },
  { value: 9, label: '9 - 单字符（验证码/车牌）' },
  { value: 10, label: '10 - 单个词（环形）' },
  { value: 11, label: '11 - 稀疏文本/无版面' },
  { value: 12, label: '12 - 稀疏文本+方向' },
  { value: 13, label: '13 - 原始行（无分割）' },
];

/** 图像预处理模式（仅前端生效）：改善低对比度/彩色背景/拍照件的识别率 */
const PREPROCESS_OPTIONS: { value: PreprocessMode; label: string }[] = [
  { value: 'none', label: 'none - 原图直传' },
  { value: 'grayscale', label: 'grayscale - 灰度化' },
  { value: 'binarize', label: 'binarize - 二值化（Otsu）' },
  { value: 'enhance', label: 'enhance - 对比度拉伸' },
];

/**
 * 配置面板：语言多选、oem/psm、保留空格、输出格式，以及「识别全部」按钮。
 */
export function ConfigPanel() {
  const params = useStore((s) => s.params);
  const setParams = useStore((s) => s.setParams);
  const languages = useStore((s) => s.languages);
  const runAll = useStore((s) => s.runAll);
  const cancelAll = useStore((s) => s.cancelAll);
  const files = useStore((s) => s.files);
  const pending = files.some((f) => f.status === 'processing');

  const toggleLang = (code: string) => {
    const has = params.languages.includes(code);
    setParams({
      languages: has ? params.languages.filter((c) => c !== code) : [...params.languages, code],
    });
  };

  return (
    <div>
      <div className="config-row">
        <label>语言（可多选）</label>
        <div className="lang-grid">
          {languages.length === 0 && <span className="empty-hint">加载语言列表中…</span>}
          {languages.map((code) => (
            <span
              key={code}
              className={`lang-chip${params.languages.includes(code) ? ' on' : ''}`}
              onClick={() => toggleLang(code)}
            >
              {code}
            </span>
          ))}
        </div>
      </div>

      <div className="config-row">
        <label>引擎模式 (oem)</label>
        <select value={params.oem} onChange={(e) => setParams({ oem: Number(e.target.value) })}>
          {OEM_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="config-row">
        <label>页面分割 (psm)</label>
        <select value={params.psm} onChange={(e) => setParams({ psm: Number(e.target.value) })}>
          {PSM_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="config-row">
        <label>字符白名单</label>
        <input
          type="text"
          className="text-input"
          placeholder="如 0123456789 或 车牌字符集（留空=不限制）"
          value={params.whitelist}
          onChange={(e) => setParams({ whitelist: e.target.value })}
        />
        <div className="hint">限定输出字符集，发票号/车牌/验证码等场景可显著提升准确率</div>
      </div>

      <div className="config-row">
        <label>图像预处理</label>
        <select
          value={params.preprocess}
          onChange={(e) => setParams({ preprocess: e.target.value as PreprocessMode })}
        >
          {PREPROCESS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div className="hint">低对比度/彩色背景/拍照件建议选 binarize 或 enhance</div>
      </div>

      <div className="config-row">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={params.preserveSpaces}
            onChange={(e) => setParams({ preserveSpaces: e.target.checked })}
          />
          保留词间空格
        </label>
      </div>

      <div className="config-row">
        <label>输出格式</label>
        <div className="seg" style={{ display: 'flex', gap: 8 }}>
          {(['txt', 'pdf'] as const).map((f) => (
            <button
              key={f}
              className=""
              style={{
                background: params.outputFormat === f ? 'var(--accent-2)' : 'var(--panel-2)',
                color: params.outputFormat === f ? '#04222f' : 'var(--text)',
              }}
              onClick={() => setParams({ outputFormat: f })}
            >
              {f === 'txt' ? '纯文本' : '可搜索 PDF'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn" disabled={pending || files.length === 0} onClick={() => runAll()}>
          {pending ? '识别中…' : '识别全部'}
        </button>
        <button
          className="btn danger"
          disabled={!pending}
          onClick={() => cancelAll()}
          title="取消当前所有正在进行的识别"
        >
          取消全部
        </button>
      </div>
    </div>
  );
}
