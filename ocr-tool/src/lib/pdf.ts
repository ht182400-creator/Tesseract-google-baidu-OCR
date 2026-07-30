import * as pdfjsLib from 'pdfjs-dist';
// Vite 通过 ?url 把 worker 文件作为静态资源引入，避免跨域/路径问题
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

/**
 * 将 PDF 文件的每一页栅格化为 PNG dataURL（在浏览器内完成，零原生依赖）。
 * @param file     用户拖入的 PDF
 * @param scale    渲染缩放（默认 2，兼顾清晰度与体积）
 * @param onProgress 每渲染完一页回调页码，便于 UI 显示进度
 */
export async function pdfToPngDataUrls(
  file: File,
  scale = 2,
  onProgress?: (page: number, total: number) => void
): Promise<string[]> {
  const data = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const urls: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法创建画布上下文');
    await page.render({ canvasContext: ctx, viewport }).promise;
    urls.push(canvas.toDataURL('image/png'));
    onProgress?.(i, doc.numPages);
  }
  return urls;
}

/**
 * 将图片文件转为 PNG Blob（统一格式，便于后端处理）。
 * 使用 Image + canvas 重新编码，过滤掉不支持的元数据。
 */
export async function imageToPngBlob(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建画布上下文');
  ctx.drawImage(bitmap, 0, 0);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('图片编码失败'))), 'image/png');
  });
}
