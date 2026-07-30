import { useEffect, useRef, useState } from 'react';
import type { FileItem } from '../types';

/**
 * 预览区：显示当前页图片，并在其上叠加 Tesseract 返回的文本行包围盒。
 * 每个框带序号，与「位置对应」结果区的卡片序号一一对应，便于定位「识别的是哪一段」。
 *
 * 关键：nat/disp 的同步**不依赖 onLoad**——浏览器对已缓存图片不会触发 load 事件，
 * 会导致 nat 永远 0、scale=1、叠加框堆左上。这里改在 useEffect 里主动读取
 * imgRef.current.naturalWidth / clientWidth（cached image 也会立即有值）。
 */
export function Preview({ file, page }: { file: FileItem | null; page: number }) {
  // Hooks 必须无条件在顶层调用（即使 file 为 null 也要先跑完 hooks 再 early-return）
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [nat, setNat] = useState({ w: 0, h: 0 });
  const [disp, setDisp] = useState({ w: 0, h: 0 });
  const url = file?.previews[page];

  useEffect(() => {
    const img = imgRef.current;
    if (!img || !url) return;
    const sync = () => {
      // 关键：cached image 的 naturalWidth 立即可用，不依赖 load 事件
      if (img.naturalWidth > 0) {
        setNat({ w: img.naturalWidth, h: img.naturalHeight });
      }
      setDisp({ w: img.clientWidth, h: img.clientHeight });
    };
    sync(); // 首次同步（覆盖 cached 与未触发 onLoad 的情况）
    img.addEventListener('load', sync); // 兜底未缓存的新加载
    const ro = new ResizeObserver(sync);
    ro.observe(img);
    return () => {
      img.removeEventListener('load', sync);
      ro.disconnect();
    };
  }, [url]);

  if (!file) {
    return <div className="preview-wrap empty">请选择文件</div>;
  }
  if (!url) {
    return <div className="preview-wrap empty">无预览（PDF 栅格化中…）</div>;
  }

  const blocks = file.pagesBlocks[page] ?? [];
  const scaleX = nat.w ? disp.w / nat.w : 1;
  const scaleY = nat.h ? disp.h / nat.h : 1;
  const lines = blocks.flatMap((b) => b.lines);

  return (
    <div className="preview-wrap">
      <div className="preview-stage" ref={stageRef}>
        <img ref={imgRef} src={url} className="preview-img" alt="预览" />
        {nat.w > 0 && lines.length > 0 && (
          <div className="loc-overlay">
            {lines.map((line, i) => (
              <div
                key={i}
                className="loc-box"
                style={{
                  left: line.left * scaleX,
                  top: line.top * scaleY,
                  width: Math.max(2, line.width * scaleX),
                  height: Math.max(2, line.height * scaleY),
                }}
                title={line.text}
              >
                <span className="loc-box-idx">{i + 1}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}