import type { OcrParams, OcrResponse, HealthResponse } from '../types';

/** 后端基址：开发走 Vite 代理（/api），生产同源 */
const BASE = '/api';

/** 获取健康检查与可用语言 */
export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${BASE}/health`);
  if (!res.ok) throw new Error('健康检查失败');
  return res.json();
}

/** 获取可用语言列表 */
export async function fetchLanguages(): Promise<string[]> {
  const res = await fetch(`${BASE}/languages`);
  if (!res.ok) throw new Error('获取语言列表失败');
  return res.json();
}

/**
 * 提交图片（已栅格化）进行 OCR。
 * @param images 图片 Blob 列表（PDF 已在前端栅格化为多张 PNG）
 * @param params  OCR 参数
 * @param signal  可选中止信号，用于「取消」识别（触发后终止请求与后端子进程）
 */
export async function postOcr(
  images: Blob[],
  params: OcrParams,
  signal?: AbortSignal
): Promise<OcrResponse> {
  const form = new FormData();
  form.append('params', JSON.stringify(params));
  images.forEach((img, i) => form.append('files', img, `page-${i}.png`));
  const res = await fetch(`${BASE}/ocr`, { method: 'POST', body: form, signal });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `OCR 失败（${res.status}）`);
  return data as OcrResponse;
}
