import { useState } from 'react';
import { useStore } from '../store';

/**
 * 结果面板：展示选中文件的识别文本，并提供复制 / 保存 / 导出 PDF / 单文件重识别。
 */
export function ResultPanel() {
  const selectedId = useStore((s) => s.selectedId);
  const item = useStore((s) => s.files.find((f) => f.id === selectedId));
  const runOcr = useStore((s) => s.runOcr);
  const cancelOcr = useStore((s) => s.cancelOcr);
  const [copied, setCopied] = useState(false);

  if (!item) {
    return <div className="empty-hint">选择左侧文件后，识别结果将显示在这里。</div>;
  }

  const combined = item.pagesText.join('\n\n');
  const busy = item.status === 'processing';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(combined);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 剪贴板不可用时静默 */
    }
  };

  const saveTxt = () => {
    const blob = new Blob([combined], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${item.name}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      <div className="result-toolbar">
        {busy ? (
          <button className="btn danger" onClick={() => cancelOcr(item.id)}>
            取消识别
          </button>
        ) : (
          <button className="btn" onClick={() => runOcr(item.id)}>
            重新识别
          </button>
        )}
        <button className="btn ghost" disabled={!combined} onClick={copy}>
          {copied ? '已复制' : '复制'}
        </button>
        <button className="btn ghost" disabled={!combined} onClick={saveTxt}>
          保存 txt
        </button>
        {item.pdfUrl && (
          <a className="btn ghost" href={item.pdfUrl} target="_blank" rel="noreferrer">
            导出 PDF
          </a>
        )}
      </div>

      {item.status === 'error' && <div className="err-box">{item.error}</div>}

      {busy && <div className="empty-hint">正在识别，请稍候…</div>}

      {!busy && combined && (
        <div className="result-text">{combined}</div>
      )}

      {!busy && !combined && !item.error && (
        <div className="empty-hint">尚未识别。点击「重新识别」或顶部「识别全部」。</div>
      )}
    </div>
  );
}
