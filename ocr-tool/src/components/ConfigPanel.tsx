import { useStore } from '../store';
import type { PreprocessMode, OutputFormat } from '../types';
import {
  OEM_OPTIONS,
  PSM_OPTIONS,
  PREPROCESS_OPTIONS,
  OUTPUT_OPTIONS,
  LANG_INFO,
  type OptionInfo,
} from '../options';

/**
 * 通用单选卡片组：每个选项是一个带「标签 + 详细解释」的可点卡片，选中高亮。
 * 用单选卡片替代下拉框，让所有选项与解释一眼可见。
 */
function RadioCards<T extends string | number>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: T;
  options: OptionInfo<T>[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="opt-list">
      {options.map((o) => (
        <label key={String(o.value)} className={`opt-card${value === o.value ? ' on' : ''}`}>
          <input
            type="radio"
            name={name}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          <span className="opt-body">
            <span className="opt-label">{o.label}</span>
            <span className="opt-desc">{o.desc}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

/**
 * 配置面板：语言多选（勾选芯片）、oem/psm/预处理/输出格式（单选卡片 + 解释）、
 * 字符白名单、保留空格（勾选卡片）与「识别全部」按钮。
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
    <div className="config-panel">
      <div className="config-row">
        <label>语言（可多选，点击勾选）</label>
        <div className="lang-grid">
          {languages.length === 0 && <span className="empty-hint">加载语言列表中…</span>}
          {languages.map((code) => {
            const info = LANG_INFO[code] ?? { name: code };
            const on = params.languages.includes(code);
            return (
              <span
                key={code}
                className={`lang-chip${on ? ' on' : ''}`}
                title={info.desc ?? info.name}
                onClick={() => toggleLang(code)}
              >
                <b>{code}</b>
                <span className="lang-name">{info.name}</span>
              </span>
            );
          })}
        </div>
        <div className="hint">可同时勾选多种语言（如 chi_sim+eng）；osd 仅用于方向检测，需配合 PSM 0/1。</div>
      </div>

      <div className="config-grid">
        <div className="config-cell">
          <label>引擎模式 (oem)</label>
          <RadioCards
            name="oem"
            value={params.oem}
            options={OEM_OPTIONS}
            onChange={(v) => setParams({ oem: v })}
          />
        </div>

        <div className="config-cell config-cell-wide">
          <label>页面分割 (psm)</label>
          <RadioCards
            name="psm"
            value={params.psm}
            options={PSM_OPTIONS}
            onChange={(v) => setParams({ psm: v })}
          />
        </div>

        <div className="config-cell">
          <label>图像预处理</label>
          <RadioCards
            name="pre"
            value={params.preprocess}
            options={PREPROCESS_OPTIONS}
            onChange={(v) => setParams({ preprocess: v as PreprocessMode })}
          />
        </div>

        <div className="config-cell">
          <label>输出格式</label>
          <RadioCards
            name="out"
            value={params.outputFormat}
            options={OUTPUT_OPTIONS}
            onChange={(v) => setParams({ outputFormat: v as OutputFormat })}
          />
        </div>
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
        <div className="hint">限定输出字符集，发票号/车牌/验证码等场景可显著提升准确率。</div>
      </div>

      <div className="config-row">
        <label className={`opt-card chk-only${params.preserveSpaces ? ' on' : ''}`}>
          <input
            type="checkbox"
            checked={params.preserveSpaces}
            onChange={(e) => setParams({ preserveSpaces: e.target.checked })}
          />
          <span className="opt-body">
            <span className="opt-label">保留词间空格</span>
            <span className="opt-desc">开启后保留原文单词间的空格，适合含自然词距的文档（如英文）。</span>
          </span>
        </label>
      </div>

      <div className="config-actions">
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
