import { useEffect, useRef, useState } from 'react';
import type { FileItem } from '../types';

/**
 * 预览区：显示当前页图片，并在其上叠加 Tesseract 返回的文本行包围盒。
 * 每个框带序号，与「位置对应」结果区的卡片序号一一对应，便于定位「识别的是哪一段」。
 */
export function Preview({ file, page }: { file: FileItem | null; page: number }) {
  if (!file) {
    return <div className="preview-wrap empty">请选择文件</div>;
  }
  const url = file.previews[page];
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [nat, setNat] = useState({ w: 0, h: 0 });
  const [disp, setDisp] = useState({ w: 0, h: 0 });

  // 监听图片显示尺寸变化（窗口缩放），用于把像素坐标映射到屏幕坐标
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const update = () => setDisp({ w: img.clientWidth, h: img.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(img);
    return () => ro.disconnect();
  }, [url, page]);

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
        <img
          ref={imgRef}
          src={url}
          className="preview-img"
          alt="预览"
          onLoad={(e) => {
            const img = e.currentTarget;
            setNat({ w: img.naturalWidth, h: img.naturalHeight });
            setDisp({ w: img.clientWidth, h: img.clientHeight });
          }}
        />
        {nat.w > 0 && lines.length > 0 && (
          <div className="loc-overlay">
            {lines.map((line, i) => (
              <div
                key={i}
                className="loc-box"
                style={{
                  left: line.left * scaleX,
                  top: line.top * scaleY,
                  width: line.width * scaleX,
                  height: line.height * scaleY,
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
