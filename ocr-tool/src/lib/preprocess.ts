import type { PreprocessMode } from '../types';

/**
 * 客户端图像预处理：在不改变分辨率的前提下改善对比度，提升 Tesseract 识别率。
 * Tesseract 对清晰、高对比度的扫描件最友好，对低对比度/彩色背景/拍照件很挑剔，
 * 灰度化 / 二值化 / 对比度拉伸往往能立竿见影地改善结果。
 *
 * 注意：预处理只改变像素值，不改变图像尺寸，因此后端返回的包围盒坐标与
 * 预处理后的预览图仍一一对应。
 */

/** 灰度权重（Rec. 601 luma） */
const GRAY_R = 0.299;
const GRAY_G = 0.587;
const GRAY_B = 0.114;

/** 单像素 RGB → 灰度 */
function rgbToGray(r: number, g: number, b: number): number {
  return GRAY_R * r + GRAY_G * g + GRAY_B * b;
}

/** Otsu 自适应阈值：返回 0-255 的最佳分割阈值 */
function otsuThreshold(gray: Float64Array): number {
  const hist = new Array<number>(256).fill(0);
  for (let i = 0; i < gray.length; i++) {
    const v = Math.min(255, Math.max(0, Math.round(gray[i])));
    hist[v]++;
  }
  const total = gray.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0;
  let wB = 0;
  let maxVar = 0;
  let threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxVar) {
      maxVar = between;
      threshold = t;
    }
  }
  return threshold;
}

/**
 * 对 RGBA 像素缓冲应用预处理（原地修改）。
 * - grayscale：转灰度
 * - binarize：灰度 + Otsu 二值化（黑底白字/白底黑字均适用）
 * - enhance：灰度 + 对比度拉伸（min-max），适合低对比度文档
 */
function applyPreprocess(data: Uint8ClampedArray, mode: PreprocessMode): void {
  if (mode === 'none') return;
  const n = data.length / 4;
  const gray = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    gray[i] = rgbToGray(data[o], data[o + 1], data[o + 2]);
  }

  if (mode === 'grayscale') {
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      const v = gray[i];
      data[o] = data[o + 1] = data[o + 2] = v;
    }
    return;
  }

  if (mode === 'binarize') {
    const t = otsuThreshold(gray);
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      const v = gray[i] >= t ? 255 : 0;
      data[o] = data[o + 1] = data[o + 2] = v;
    }
    return;
  }

  if (mode === 'enhance') {
    let min = 255;
    let max = 0;
    for (let i = 0; i < n; i++) {
      const g = gray[i];
      if (g < min) min = g;
      if (g > max) max = g;
    }
    const range = max - min || 1;
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      const v = ((gray[i] - min) / range) * 255;
      data[o] = data[o + 1] = data[o + 2] = v;
    }
  }
}

/**
 * 对单个图片 Blob 应用预处理，返回处理后的 Blob 与 dataURL。
 * @param src 原始图片 Blob
 * @param mode 预处理模式；'none' 直接原样返回（dataURL 用 createObjectURL）
 */
export async function preprocessBlob(
  src: Blob,
  mode: PreprocessMode
): Promise<{ blob: Blob; dataUrl: string }> {
  if (mode === 'none') {
    return { blob: src, dataUrl: URL.createObjectURL(src) };
  }
  const bitmap = await createImageBitmap(src);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('无法创建画布上下文，预处理失败');
  }
  ctx.drawImage(bitmap, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  applyPreprocess(imgData.data, mode);
  ctx.putImageData(imgData, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas.toBlob 失败'))), 'image/png');
  });
  const dataUrl = canvas.toDataURL('image/png');
  bitmap.close();
  return { blob, dataUrl };
}

/**
 * 对 dataURL 列表批量预处理（PDF 多页），返回处理后的 Blob 与 dataURL 列表。
 */
export async function preprocessDataUrls(
  urls: string[],
  mode: PreprocessMode
): Promise<{ blobs: Blob[]; dataUrls: string[] }> {
  if (mode === 'none') {
    const blobs = await Promise.all(urls.map((u) => fetch(u).then((r) => r.blob())));
    return { blobs, dataUrls: urls };
  }
  const results = await Promise.all(urls.map((u) => dataUrlToBlob(u).then((b) => preprocessBlob(b, mode))));
  return {
    blobs: results.map((r) => r.blob),
    dataUrls: results.map((r) => r.dataUrl),
  };
}

/** dataURL → Blob（供上传或二次处理） */
export function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return fetch(dataUrl).then((r) => r.blob());
}
