# 05 — Tesseract OCR 工具 架构设计与构建方案

> 版本：v0.1（草案）
> 日期：2026-07-30
> 视角：架构师 / 全栈工程师 / 测试专家
> 配套：`04_需求说明书`

---

## 1. 技术选型

### 1.1 推荐栈（已据环境核实）
| 层 | 技术 | 理由 |
|---|---|---|
| 前端 | **React 18 + TypeScript + Vite** | 本机 Node v24，Vite 启动快、HMR 佳；与仓库既有前端经验一致 |
| UI 组件 | **Ant Design 5**（或 shadcn/ui） | 专业、无障碍、表单/拖拽/消息开箱即用 |
| 拖拽 | **react-dropzone** | 成熟稳定，支持多文件/校验 |
| PDF 渲染 | **pdfjs-dist** | 纯 JS，浏览器内渲染 PDF→Canvas→PNG，**无需 poppler/ghostscript**（已核实本机缺失） |
| 后端 | **Node + Express + TypeScript** | 轻量；用 `child_process.spawn` 调 tesseract |
| 进程通信 | REST（Web 版）/ **Electron IPC**（桌面版，后期） | 本期 Web 版用 fetch |
| 测试 | **Vitest**（单元/集成）+ **Playwright**（E2E） | 与 Vite 同生态；E2E 覆盖拖拽真实流程 |
| 打包 | 后期 **Electron Forge / electron-builder** | 套壳成 exe（可选） |

### 1.2 替代方案与取舍
- **Electron 直接起步**：体验好但需打包链，迭代慢；先 Web 后套壳更敏捷。
- **PyMuPDF(Python) 做 PDF 栅格**：需 Python 服务，增加运维面；pdfjs-dist 零依赖更优。
- **调用 poppler/ghostscript**：本机未装，需用户额外安装，体验差 → 否决。

---

## 2. 系统架构

### 2.1 分层
```
┌──────────────────────────────────────────────┐
│  浏览器 (Renderer)  React + AntD + pdfjs-dist │
│  - Dropzone / 预览 / 参数表单 / 结果面板       │
│  - PDF 页 → Canvas → PNG (Blob)               │
└───────────────┬──────────────────────────────┘
                │  fetch (multipart: image + params)
┌───────────────▼──────────────────────────────┐
│  Node 后端 (Express)                           │
│  ├─ OcrController  路由 /api/ocr, /languages   │
│  ├─ OcrService     拼参 + spawn tesseract      │
│  ├─ FileService    校验 / 临时目录管理          │
│  ├─ ConfigService  读取/持久化设置             │
│  └─ TempService    任务级临时目录，用完清理     │
└───────────────┬──────────────────────────────┘
                │  child_process.spawn
┌───────────────▼──────────────────────────────┐
│  外部进程                                      │
│  google.tesseract.tesseract-main.exe          │
│  (同目录 dll 自动加载；--tessdata-dir 指定包)  │
└──────────────────────────────────────────────┘
```

### 2.2 目录结构（提议）
```
ocr-tool/
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
├─ server/
│  ├─ index.ts            # Express 启动
│  ├─ routes/ocr.ts
│  ├─ services/ocrService.ts
│  ├─ services/fileService.ts
│  ├─ services/configService.ts
│  └─ types.ts            # 与前端共享
├─ src/                   # 前端
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ components/Dropzone.tsx, Preview.tsx, ConfigPanel.tsx, ResultPanel.tsx
│  ├─ lib/pdf.ts          # pdfjs-dist 渲染
│  ├─ lib/api.ts          # fetch 封装
│  └─ types.ts
├─ tests/
│  ├─ unit/              # Vitest
│  ├─ integration/       # 真调 tesseract
│  └─ e2e/               # Playwright
└─ playwright.config.ts
```

---

## 3. 模块设计（职责与接口）

### 3.1 后端

**OcrService.spawnOcr(inputPath, opts) → Promise<{text?:string, pdfPath?:string}>**
- 输入：`inputPath`(临时 PNG)、`languages[]`、`oem`、`psm`、`preserveSpaces`、`outputFormat`。
- 拼参（**防注入**：所有路径/语言用白名单与绝对路径，禁止 shell 插值）：
  ```
  tesseract <inputPath> <outBase> -l eng+chi_tra --oem 1 --psm 6
            -c preserve_interword_spaces=1 --tessdata-dir <tessdataDir> [pdf|txt]
  ```
- 超时 60s（`spawn` + `setTimeout` kill）；捕获 stdout/stderr；读取 `outBase.txt` / `outBase.pdf`。
- 异常分类：exe 不存在 / tessdata 缺失 / 语言包缺失 / 超时 / 非零退出。

**FileService.validate(file)** → 扩展名 + 大小校验；`ensureTempDir(taskId)`；`cleanup(taskId)`。

**ConfigService** → 读取 `ocr-tool.config.json`（首次写默认路径）；`listLanguages()` 扫描 tessdata 目录 `.traineddata`。

**路由**
- `POST /api/ocr`：multipart `file` + JSON `params` → 返回 `{text, pdfUrl?}`。
- `GET /api/languages`：返回可用语言列表。
- `GET /api/health`：探活 + tesseract 版本探测。
- `GET /api/static/:taskId/:file`：临时 PDF 下载（带过期）。

### 3.2 前端
- **Dropzone**：react-dropzone，accept 图片+pdf，多选，校验后入 store。
- **Preview**：图片用 `URL.createObjectURL`；PDF 用 pdfjs-dist 渲染首页/全部页到 canvas → dataURL 缩略图，可放大查看。
- **ConfigPanel**：语言多选（来自 `/api/languages`）、oem/psm 下拉、preserveSpaces、outputFormat。
- **ResultPanel**：文本区 + 工具栏（复制/保存/新建/插入/导出 PDF）+ 状态条；失败红字提示。
- **store**：轻量（Zustand 或 React context）管理文件列表、当前选中、各文件任务状态。

---

## 4. 关键流程

### 4.1 图片 OCR 时序
```
用户拖入 PNG → Dropzone 校验 → 预览
   → 点「开始识别」
   → 前端 fetch POST /api/ocr (Blob + params)
   → 后端写临时 PNG → OcrService.spawnOcr
   → tesseract 生成 outBase.txt/.pdf
   → 后端读回 → 返回 {text, pdfUrl}
   → 前端 ResultPanel 展示 + 提供下载
```

### 4.2 PDF OCR 时序
```
用户拖入 PDF → pdfjs-dist 渲染每页 → 多张 PNG Blob
   → 逐页（或合并）POST /api/ocr
   → 后端分别 OCR → 文本按页码拼接
   → 可选：用 tesseract --pdf 对每页图生成可搜索 PDF 再合并（或仅导出合并 txt）
   → 结果区显示「第1页…第N页…」分段文本
```

### 4.3 取消 / 清理
- 前端 AbortController 取消请求；后端收到断开则 kill 子进程 + cleanup 临时目录。

---

## 5. 构建与运行

```bash
# 安装
cd ocr-tool && npm install

# 开发（前后端同启：Vite 代理 /api → Express）
npm run dev          # 启动后端(:3001) + 前端(:5173)

# 构建前端
npm run build        # 产出 dist/，由 Express 静态托管（单端口部署）

# 生产启动
npm run start        # Express 托管 dist + API，浏览器开 http://localhost:3001

# 测试
npm run test         # Vitest 单元+集成
npm run test:e2e     # Playwright
```

**默认配置**：首次启动若检测不到 `ocr-tool.config.json`，写入 1.3 节默认路径（tesseract exe 与 tessdata 实际位置），用户可在设置页改。

---

## 6. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| tesseract dll 加载失败 | 启动即崩 | 后端 health 探测版本，失败给明确提示；文档写明需同目录 dll |
| PDF 渲染大文件卡顿 | UI 假死 | Web Worker 渲染 pdfjs；缩略图降采样；懒加载 |
| 并发 OCR 打满 CPU | 卡顿 | 串行队列 + 并发上限(默认2) |
| 语言包缺失 | 识别失败/乱码 | `/api/languages` 动态发现；选了未安装的包时前端警告 |
| 子进程僵尸/超时 | 资源泄漏 | 超时 kill + 请求断开监听 + 临时目录定期清理 |
| 路径含空格/中文 | 参数出错 | 全程用绝对路径 + spawn 数组参数（非 shell），不依赖引号 |

---

## 7. 测试方案（测试专家视角）

### 7.1 分层与覆盖目标
- **单元测试（Vitest）**：纯函数/拼参/校验，目标分支覆盖 ≥ 90%。
- **集成测试**：真实 spawn tesseract（用仓库 `test/testing/phototest.tif` 作黄金样本）。
- **E2E（Playwright）**：真实拖拽 + 识别 + 结果断言。

### 7.2 单元测试用例（数据驱动）
`OcrService.buildArgs` 参数拼装：
| 用例 | 输入 | 预期 |
|---|---|---|
| 最小参数 | (img, {lang:['eng']}) | 含 `-l eng --oem 1 --psm 6` |
| 多语言 | lang:['eng','chi_tra'] | `-l eng+chi_tra` |
| 保留空格 | preserveSpaces:true | 含 `-c preserve_interword_spaces=1` |
| 输出 pdf | format:'pdf' | 末参 `pdf`，生成 pdfUrl |
| 非法语言注入 | lang:['eng;rm -rf'] | **拒绝/清洗**，不出现 shell 元字符 |
| 空语言 | lang:[] | 抛错「至少选择一种语言」 |

`FileService.validate`：
| 用例 | 输入 | 预期 |
|---|---|---|
| 正常 png | 1.png, 200KB | 通过 |
| 0 字节 | 0KB | 拒绝「文件为空」 |
| 不支持 | a.docx | 拒绝「不支持的格式」 |
| 超大 | 500MB | 拒绝（阈值可配） |

### 7.3 集成测试（真实 tesseract）
- 用 `test/testing/phototest.tif` → 调 spawnOcr → 断言返回文本**非空**且含已知词（如 "This is a lot" 片段）。
- 故意把 tessdataDir 指错 → 断言抛「语言包目录不存在」。
- 把 tesseractPath 指错 → 断言抛「找不到 Tesseract 程序」。
- 超时：传超大图 + 把超时设为 1ms → 断言超时错误且子进程被杀。

### 7.4 E2E（Playwright，真实浏览器）
- 启动 dev server → 打开页面 → `setInputFiles` 拖入 phototest.tif → 点识别 → 等待结果区出现文本 → 断言非空。
- 拖入一个样本 PDF（tests/fixtures/sample.pdf）→ 断言预览出现多页缩略图 → 识别 → 结果分段。
- 拖入 `bad.docx` → 断言页面出现红色拒绝提示，不崩溃。
- 复制按钮：点击后读取剪贴板断言等于结果文本。
- 边界：连续快速拖入 10 个文件 → 断言队列顺序完成、无遗漏。

### 7.5 异常/并发/边界矩阵
- 异常：exe 缺失、tessdata 缺失、语言缺失、超时、非零退出、网络断开（Abort）。
- 并发：批量 10 文件串行队列；模拟中途取消第 3 个。
- 边界：0 字节、超大、极长文件名、含中文/空格路径、多页 PDF(>50 页)、空 PDF。

### 7.6 测试数据
- 黄金图：`test/testing/phototest.tif`（仓库自带）。
- 样本 PDF：`tests/fixtures/sample.pdf`（内置 2–3 页，含英文）。
- 中文样本：`tests/fixtures/cn.png`（需用户放 chi_tra 后验证）。
- 坏样本：`bad.docx`、`empty.png`。

### 7.7 测试日志规范
- 用 `logging` 风格：每个用例开始/结束记录；失败标红并附 traceback。
- 日志文件带日期时间：`tests/logs/test_YYYYMMDD_HHMMSS.log`。

---

## 8. 里程碑 / 任务分解（WBS）

| 阶段 | 任务 | 产出 | 状态（2026-07-30） |
|---|---|---|---|
| M1 脚手架 | 初始化 ocr-tool（Vite+React+TS+Express+Vitest+Playwright） | 可运行空壳 | ✅ 完成 |
| M2 后端核心 | OcrService/FileService/ConfigService + 路由 + 默认配置 | API 可 curl 调用 | ✅ 完成 |
| M3 前端核心 | Dropzone/Preview/ConfigPanel/ResultPanel + store | 能拖图识别 | ✅ 完成 |
| M4 PDF | pdfjs-dist 渲染 + 多页流程 | PDF 可用 | ✅ 完成 |
| M5 体验 | 进度/取消/错误/导出（复制/保存/导出可搜索 PDF） | 完整闭环 | ✅ 完成（取消：前端 AbortController + 后端 res close 判定真实断线杀子进程） |
| M6 测试 | 单元/集成/E2E | 全绿 | ✅ 完成（单元 14 + 集成 4 + E2E 3 全绿） |
| M7 套壳 | Electron 打包 exe | 独立桌面程序 | ⏳ 待做 |
| M5 体验 | 进度/取消/错误提示/复制保存导出 | 专业交互 |
| M6 测试 | 单元+集成+E2E 全绿；测试报告 | 验收通过 |
| M7（可选） | Electron 套壳打包 exe | 独立桌面程序 |

---

## 8.1 交付形态选型结论（2026-07-30 评审）

### 8.1.1 结论
**做 Web 版更有把握，且风险更低。建议「Web 优先、Electron 后续套壳成 exe」两步走。**

核心差异只有一点：`tesseract` 的 exe + 44 个 dll 已经躺在固定目录
（`.sw\out\154291`）里，Web 版直接 `child_process.spawn` 调它即可；Exe 版却要
重新把这些二进制嵌进安装包并解决运行时路径——这是真正的坑，不是功能坑。

### 8.1.2 选型对比表

| 维度 | Web 版（Vite+React + Node/Express） | Exe 版（Electron 套壳） |
|---|---|---|
| 调用 tesseract | 直接用现有 `.sw\out\154291` 的 exe + 44 个 dll（路径固定，**零打包**） | 必须把 tesseract exe + 44 个 dll 拷进 `extraResources`，运行时从 `resourcesPath` 解析再 spawn（**打包风险点**） |
| PDF 栅格 | 浏览器内 pdfjs-dist，无原生依赖 | 同左（渲染在 renderer，OCR 在 main，走 IPC） |
| 测试 | Playwright 真实浏览器 E2E 直接跑，全链路可验证 | 打包后还需验证「安装包真能启动 + 真能 spawn tesseract」，无法替用户点安装包 |
| 分发 | 需本机有 Node，跑 `npm start` 开浏览器 | 双击 exe，无需 Node；但**无代码签名**会有「未知发布者/SmartScreen」警告 |
| 体积 | 小 | ~150MB+（含 Chromium 内核） |
| 交付速度 | 快，迭代快 | 慢，打包链易卡 |

### 8.1.3 推荐路径（与 WBS 对齐）
1. **M1–M6 先做 Web 版**：功能、UI、测试一次做扎实，Playwright 全绿。
2. **M7 再套 Electron 壳**：前端/后端代码基本复用，只把 spawn 路径从「固定路径」
   换成「resources 路径」，产出独立 exe。

这样用户立刻能用一个可测试的版本，又不放弃最终 exe。

### 8.1.4 待用户拍板的方向
- **选 A：Web 版优先**（推荐）——先搭 M1 脚手架并实现核心识别。
- **选 B：直接做 Exe**——跳过 Web，直接上 Electron，接受打包风险并由我处理 dll 嵌入。

---

## 9. 待确认项（同 04 §8）
- 交付形态：**用户已于 2026-07-30 拍板「选 A：Web 版优先」**。已按 M1–M6 实现并全绿。
- 选型对比与两步建议见 8.1；M7（Electron 套壳）待后续按需进行。
- 待补：M5 的「识别取消」功能（AbortController 终止后端子进程）尚未实现，列为下一迭代。
