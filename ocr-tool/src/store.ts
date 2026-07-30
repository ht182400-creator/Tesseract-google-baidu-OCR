import { create } from 'zustand';
import type { FileItem, OcrParams } from './types';
import { pdfToPngDataUrls } from './lib/pdf';
import { postOcr } from './lib/api';

/** 默认识别参数 */
const DEFAULT_PARAMS: OcrParams = {
  languages: ['eng'],
  oem: 1,
  psm: 6,
  preserveSpaces: false,
  outputFormat: 'txt',
};

/** 原始 File 引用（不进状态，便于 PDF/图片还原与上传） */
const origFiles = new Map<string, File>();
/** 每个进行中识别对应的中止控制器（用于「取消」） */
const aborts = new Map<string, AbortController>();

let counter = 0;
const nextId = () => `f${Date.now()}-${counter++}`;

interface OcrStore {
  files: FileItem[];
  params: OcrParams;
  languages: string[];
  health: { ok: boolean; version: string } | null;
  globalError: string | null;
  selectedId: string | null;

  setLanguages: (l: string[]) => void;
  setHealth: (h: { ok: boolean; version: string }) => void;
  setParams: (patch: Partial<OcrParams>) => void;
  setGlobalError: (msg: string | null) => void;
  select: (id: string | null) => void;

  addFiles: (files: File[]) => Promise<void>;
  removeFile: (id: string) => void;
  clearAll: () => void;

  runOcr: (id: string) => Promise<void>;
  runAll: () => Promise<void>;
  cancelOcr: (id: string) => void;
  cancelAll: () => void;
}

export const useStore = create<OcrStore>((set, get) => ({
  files: [],
  params: DEFAULT_PARAMS,
  languages: [],
  health: null,
  globalError: null,
  selectedId: null,

  setLanguages: (l) => set({ languages: l }),
  setHealth: (h) => set({ health: h }),
  setParams: (patch) => set((s) => ({ params: { ...s.params, ...patch } })),
  setGlobalError: (msg) => set({ globalError: msg }),
  select: (id) => set({ selectedId: id }),

  addFiles: async (incoming) => {
    const newItems: FileItem[] = [];
    for (const file of incoming) {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const id = nextId();
      origFiles.set(id, file);
      if (isPdf) {
        newItems.push({ id, name: file.name, kind: 'pdf', previews: [], status: 'idle', pagesText: [] });
        pdfToPngDataUrls(file, 2)
          .then((urls) =>
            set((s) => ({ files: s.files.map((f) => (f.id === id ? { ...f, previews: urls } : f)) }))
          )
          .catch((err) =>
            set((s) => ({
              files: s.files.map((f) =>
                f.id === id ? { ...f, status: 'error', error: `PDF 栅格化失败: ${err.message}` } : f
              ),
            }))
          );
      } else {
        const url = URL.createObjectURL(file);
        newItems.push({ id, name: file.name, kind: 'image', previews: [url], status: 'idle', pagesText: [] });
      }
    }
    set((s) => ({ files: [...s.files, ...newItems], selectedId: newItems[0]?.id ?? s.selectedId }));
  },

  removeFile: (id) => {
    origFiles.delete(id);
    set((s) => ({
      files: s.files.filter((f) => f.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
  },

  clearAll: () => {
    origFiles.clear();
    set({ files: [], selectedId: null });
  },

  runOcr: async (id) => {
    const item = get().files.find((f) => f.id === id);
    if (!item || item.status === 'processing') return;
    // 每次识别建立独立中止控制器，供「取消」使用
    const controller = new AbortController();
    aborts.set(id, controller);
    set((s) => ({
      files: s.files.map((f) => (f.id === id ? { ...f, status: 'processing', error: undefined } : f)),
    }));
    try {
      const orig = origFiles.get(id);
      if (!orig) throw new Error('原始文件丢失，请重新添加');

      let imageBlobs: Blob[];
      if (item.kind === 'pdf') {
        // PDF 已在前端栅格化为多张 PNG dataURL，这里还原为 Blob 逐页上传
        imageBlobs = await Promise.all(item.previews.map((u) => fetch(u).then((r) => r.blob())));
      } else {
        imageBlobs = [orig];
      }

      const res = await postOcr(imageBlobs, get().params, controller.signal);
      set((s) => ({
        files: s.files.map((f) =>
          f.id === id
            ? { ...f, status: 'done', pagesText: res.pages.map((p) => p.text), pdfUrl: res.pages[0]?.pdfUrl }
            : f
        ),
      }));
    } catch (err) {
      const e = err as Error;
      if (e.name === 'AbortError') {
        // 用户主动取消：回退为待识别状态，不视为错误
        set((s) => ({ files: s.files.map((f) => (f.id === id ? { ...f, status: 'idle', error: undefined } : f)) }));
      } else {
        set((s) => ({ files: s.files.map((f) => (f.id === id ? { ...f, status: 'error', error: e.message } : f)) }));
      }
    } finally {
      aborts.delete(id);
    }
  },

  runAll: async () => {
    for (const f of get().files) {
      if (f.status !== 'done') await get().runOcr(f.id);
    }
  },

  cancelOcr: (id) => {
    aborts.get(id)?.abort();
  },

  cancelAll: () => {
    aborts.forEach((c) => c.abort());
  },
}));
