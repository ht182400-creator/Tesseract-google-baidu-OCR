import { useStore } from '../store';

/**
 * 预览面板：展示当前选中文件的图片或 PDF 各页缩略图。
 */
export function Preview() {
  const selectedId = useStore((s) => s.selectedId);
  const item = useStore((s) => s.files.find((f) => f.id === selectedId));

  if (!item) {
    return <div className="empty-hint">尚未选择文件。拖入图片 / PDF 后，这里显示预览。</div>;
  }

  if (item.status === 'error' && item.previews.length === 0) {
    return <div className="err-box">{item.error}</div>;
  }

  if (item.previews.length === 0) {
    return <div className="empty-hint">正在栅格化 PDF，请稍候…</div>;
  }

  return (
    <div className="preview-wrap">
      {item.previews.map((url, i) => (
        <div className="preview-card" key={i}>
          <img src={url} alt={`page-${i + 1}`} />
          <div className="pg">
            {item.kind === 'pdf' ? `第 ${i + 1} 页` : item.name}
          </div>
        </div>
      ))}
    </div>
  );
}
