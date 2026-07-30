import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useStore } from '../store';

/**
 * 拖拽 / 点击 添加文件区。
 * 接受图片与 PDF；PDF 会在前端栅格化，图片直接送入后端。
 */
export function Dropzone() {
  const addFiles = useStore((s) => s.addFiles);
  const setGlobalError = useStore((s) => s.setGlobalError);
  const [active, setActive] = useState(false);

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length) {
        setGlobalError(null);
        addFiles(accepted);
      }
    },
    [addFiles, setGlobalError]
  );

  const onDropRejected = useCallback(
    (rejections: { file: File }[]) => {
      const names = rejections.map((r) => r.file.name).join('、');
      setGlobalError(`已拒绝不支持的文件：${names}（仅支持图片与 PDF）`);
    },
    [setGlobalError]
  );

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    onDropRejected,
    onDragEnter: () => setActive(true),
    onDragLeave: () => setActive(false),
    accept: { 'image/*': [], 'application/pdf': ['.pdf'] },
    noClick: true,
    noKeyboard: true,
  });

  return (
    <div className="dropzone-bar">
      <div
        {...getRootProps()}
        className={`dropzone${active ? ' active' : ''}`}
        onClick={open}
      >
        <input {...getInputProps()} />
        <div style={{ fontSize: 15, marginBottom: 4 }}>拖入图片或 PDF 到此处，或点击选择</div>
        <div style={{ fontSize: 12 }}>支持 PNG/JPG/TIF/… 与 PDF（PDF 将自动栅格化后识别）</div>
      </div>
    </div>
  );
}
