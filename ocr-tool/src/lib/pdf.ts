import * as pdfjsLib from 'pdfjs-dist';
// Vite 通过 ?url 把 worker 文件作为静态资源引入，避免跨域/路径问题
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

/**
 * PDF 栅格化渲染 DPI：Tesseract 对 300 DPI 左右的扫描件识别率最佳，
 * 而 PDF 内部坐标基准为 72 DPI，故渲染缩放 = 目标 DPI / 72 ≈ 4.17。
 * 相比默认的 scale=2（≈144 DPI），文字边缘更清晰，识别率明显提升。
 */
export const PDF_RENDER_DPI = 300;
export const PDF_RENDER_SCALE = PDF_RENDER_DPI / 72;

/**
 * 将 PDF 文件的每一页栅格化为 PNG dataURL（在浏览器内完成，零原生依赖）。
 * @param file     用户拖入的 PDF
 * @param scale    渲染缩放（默认 PDF_RENDER_SCALE，对应 300 DPI，提升识别率）
 * @param onProgress 每渲染完一页回调页码，便于 UI 显示进度
 */
export async function pdfToPngDataUrls(
  file: File,
  scale: number = PDF_RENDER_SCALE,
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
