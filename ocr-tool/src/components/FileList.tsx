import { useStore } from '../store';

/**
 * 左侧文件列表：展示已添加文件、状态徽标，支持选中 / 删除 / 清空。
 */
export function FileList() {
  const files = useStore((s) => s.files);
  const selectedId = useStore((s) => s.selectedId);
  const select = useStore((s) => s.select);
  const removeFile = useStore((s) => s.removeFile);
  const clearAll = useStore((s) => s.clearAll);
  const cancelOcr = useStore((s) => s.cancelOcr);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, flex: 1 }}>文件 ({files.length})</h3>
        {files.length > 0 && (
          <button className="btn ghost" style={{ padding: '4px 8px' }} onClick={clearAll}>
            清空
          </button>
        )}
      </div>
      <div className="file-list">
        {files.map((f) => (
          <div
            key={f.id}
            className={`file-item${f.id === selectedId ? ' selected' : ''}`}
            onClick={() => select(f.id)}
          >
            <span className={`badge ${f.kind}`}>{f.kind.toUpperCase()}</span>
            <span className="name" title={f.name}>{f.name}</span>
            {f.status === 'processing' && <span className="status processing">…</span>}
            {f.status === 'done' && <span className="status done">✓</span>}
            {f.status === 'error' && <span className="status error">✕</span>}
            {f.status === 'processing' ? (
              <button
                className="btn ghost"
                style={{ padding: '2px 6px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  cancelOcr(f.id);
                }}
              >
                取消
              </button>
            ) : (
              <button
                className="btn ghost"
                style={{ padding: '2px 6px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(f.id);
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        {files.length === 0 && <div className="empty-hint">暂无文件</div>}
      </div>
    </div>
  );
}
