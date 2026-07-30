import { useEffect, useRef, useState } from 'react';
import type { FileItem, OcrLine } from '../types';

/**
 * 从原图按包围盒裁剪出该文本行的小图（canvas），与识别文本并排展示，
 * 解决「识别结果排列混乱、不知道对应原图哪一段」的问题。
 *
 * 关键：缩略图最小高度兜底（表格行 height 可能仅 20px，算出 canvas h≈7px 不可见），
 * 强制 h≥56px 让所有行都有清晰可读的缩略图；并主动兼容 cached image 不触发 onload 的情况。
 */
function LineThumb({ src, box }: { src: string; box: OcrLine }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    let cancelled = false;
    const img = new Image();
    const draw = () => {
      if (cancelled) return;
      if (!img.naturalWidth) return; // 兜底：未加载完直接返回（让 onload 再来）
      const ctx = c.getContext('2d');
      if (!ctx) return;
      const ratio = box.width / box.height || 1;
      const MIN_H = 56; // 最小高度：避免矮行（表格行）算出 7px 看不见
      let w = Math.max(120, Math.min(420, box.width));
      let h = Math.max(MIN_H, Math.round(w / ratio));
      // 若算出的 w 仍让 h 超过 220，按 h 反推 w（防超长行缩略图过高）
      if (h > 220) {
        h = 220;
        w = Math.max(120, Math.round(h * ratio));
      }
      c.width = Math.round(w);
      c.height = Math.round(h);
      const pad = Math.round(Math.min(box.width, box.height) * 0.08);
      const sx = Math.max(0, box.left - pad);
      const sy = Math.max(0, box.top - pad);
      const sw = Math.min(img.naturalWidth - sx, box.width + pad * 2);
      const sh = Math.min(img.naturalHeight - sy, box.height + pad * 2);
      try {
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
      } catch (e) {
        // drawImage 偶发（参数越界/tainted）不致命，画占位底色便于发现
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, c.width, c.height);
      }
    };
    img.onload = draw;
    img.src = src;
    // 关键：cached image 设 src 后 .complete 立即 true，但 onload 异步/可能不触发，
    // 这里在设 src 之前绑 onload，再立刻检查 complete 同步触发一次绘制。
    if (img.complete) draw();
    return () => {
      cancelled = true;
    };
  }, [src, box]);
  return <canvas ref={ref} className="loc-thumb" />;
}

/**
 * 结果区：提供两种视图——
 *  - 位置对应：每行显示「原图裁剪块 + 识别文本」，序号与预览区包围盒一致；
 *  - 纯文本：保持原有按页拼接文本，支持复制/下载。
 */
export function ResultPanel({
  file,
  page,
  onPage,
}: {
  file: FileItem | null;
  page: number;
  onPage?: (p: number) => void;
}) {
  const [view, setView] = useState<'loc' | 'text'>('loc');

  if (!file || file.status === 'idle') {
    return (
      <div className="result-panel">
        <div className="empty-hint">尚未识别</div>
      </div>
    );
  }
  if (file.status === 'processing') {
    return (
      <div className="result-panel">
        <div className="empty-hint">识别中…</div>
      </div>
    );
  }
  if (file.status === 'error') {
    return (
      <div className="result-panel">
        <div className="empty-hint error">识别失败：{file.error}</div>
      </div>
    );
  }

  const text = file.pagesText[page] ?? '';
  const textLines = text.split('\n');
  const blocks = file.pagesBlocks[page] ?? [];
  const lines = blocks.flatMap((b) => b.lines);
  const pageCount = file.previews.length;
  const previewUrl = file.previews[page];

  const downloadTxt = () => {
    try {
      const blob = new Blob([file.pagesText.join('\n\n')], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${file.name}.txt`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      alert(`下载失败: ${(e as Error).message}`);
    }
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      alert(`复制失败: ${(e as Error).message}`);
    }
  };

  return (
    <div className="result-panel">
      <div className="result-toolbar">
        <div className="pdf-pager">
          {pageCount > 1 && (
            <>
              <button className="btn ghost" disabled={page <= 0} onClick={() => onPage?.(page - 1)}>
                ← 上一页
              </button>
              <span className="page-indicator">
                {page + 1} / {pageCount}
              </span>
              <button className="btn ghost" disabled={page >= pageCount - 1} onClick={() => onPage?.(page + 1)}>
                下一页 →
              </button>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn ghost" onClick={copyText}>
            复制
          </button>
          <button className="btn ghost" onClick={downloadTxt}>
            下载txt
          </button>
          {file.pdfUrl && (
            <a className="btn ghost" href={file.pdfUrl} target="_blank" rel="noreferrer">
              下载可搜索PDF
            </a>
          )}
        </div>
      </div>

      <div className="result-tabs">
        <button className={`tab${view === 'loc' ? ' on' : ''}`} onClick={() => setView('loc')}>
          位置对应
        </button>
        <button className={`tab${view === 'text' ? ' on' : ''}`} onClick={() => setView('text')}>
          纯文本
        </button>
      </div>

      {view === 'loc' ? (
        <div className="loc-list">
          {lines.length === 0 ? (
            <div className="empty-hint">本页未解析出带位置的结构化结果（请确认 PSM 未设为无分割模式，或切换到「纯文本」）。</div>
          ) : (
            lines.map((line, i) => (
              <div className="loc-card" key={i}>
                <div className="loc-card-head">
                  <div className="loc-idx">{i + 1}</div>
                  <div className="loc-thumb-wrap">{previewUrl && <LineThumb src={previewUrl} box={line} />}</div>
                </div>
                <div className="loc-text">
                  <div className="loc-text-body">{line.text || '（空）'}</div>
                  <div className="loc-meta">
                    置信度 {line.conf >= 0 ? `${line.conf.toFixed(1)}%` : 'n/a'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="result-text">
          {textLines.map((ln, i) => (
            <div key={i} className="result-line">
              {ln || ' '}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
