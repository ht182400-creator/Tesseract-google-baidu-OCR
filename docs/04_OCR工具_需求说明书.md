# 04 — Tesseract OCR 桌面工具 需求说明书（SRS）

> 版本：v0.1（草案）
> 日期：2026-07-30
> 作者视角：架构师 / 全栈工程师 / 测试专家
> 关联文档：`01_架构分析`、`02_测试指南`、`03_构建汇总`、`05_架构设计与构建方案`

---

## 1. 引言

### 1.1 目的
为本仓库已构建好的 Windows 版 Tesseract（`google.tesseract.tesseract-main.exe`）提供一个**专业、易用的图形化操作界面**，让用户通过"选择 / 拖入"图片或 PDF 即可完成 OCR，并在界面上直观看到「原始内容预览」与「识别结果」，无需记忆命令行参数。

### 1.2 范围
- **包含**：图片/PDF 导入（点击选择 + 拖拽）、文件预览、OCR 参数配置、OCR 执行与进度、结果展示与导出（文本 / 可搜索 PDF）、基础设置（路径、语言管理）。
- **不包含（本期）**：批量后台队列持久化、云端识别、训练/微调、多用户/权限、OCR 结果后编辑校对（仅展示与复制/保存）。

### 1.3 背景
当前仓库已通过 SW 在 Windows 完成构建，主程序位于：
`D:\Work_Area\AI\tesseract\.sw\out\154291\google.tesseract.tesseract-main.exe`
语言包位于 `tessdata_unittest\tessdata`（eng/chi_tra/jpn/ara/heb/hin/kmr/osd/vie）与 `tessdata_best`（eng/fra/kmr/osd）。`chi_sim`/`kor` 等需用户自行下载放入。

### 1.4 术语
- **OCR**：光学字符识别。
- **oem**：OCR Engine Mode（0=传统，1=LSTM，2=两者，3=默认）。
- **psm**：Page Segmentation Mode（版面分割模式，0–13）。
- **可搜索 PDF**：原图作为背景、识别文字作为隐藏文本层的 PDF。
- **pdfjs-dist**：纯 JS 的 PDF 解析/渲染库，可在浏览器内把 PDF 页渲染为图像。

---

## 2. 总体描述

### 2.1 产品前景
一个**本地优先**的 OCR 工具：所有文件处理均在用户机器完成，不上传任何数据。界面分三栏——左：文件列表与预览；中：参数配置与执行控制；右：识别结果与导出。

### 2.2 用户特征
- 普通办公/研究人员：会用鼠标拖文件，不懂命令行。
- 开发者：可能想自定义 tesseract 路径、tessdata 路径、oem/psm。

### 2.3 运行环境
| 项 | 要求 |
|---|---|
| OS | Windows 10/11（x64） |
| Node | ≥ 18（开发/运行后端；本机 v24.13.0） |
| 浏览器 | Chromium 内核（Electron 内嵌或用户本机 Chrome/Edge） |
| Tesseract | 已构建的 `google.tesseract.tesseract-main.exe` + 同目录 dll |
| 语言包 | `tessdata_unittest/tessdata` 或 `tessdata_best` 下 `.traineddata` |
| PDF 依赖 | **无**（用 pdfjs-dist 浏览器内渲染，无需 poppler/ghostscript） |

### 2.4 约束与假设
- **约束**：Tesseract 为外部进程，必须通过子进程调用；其路径与 dll 目录绑定（必须从 exe 所在目录加载 dll）。
- **假设**：用户机器能运行 Node；PDF 不依赖任何系统级 PDF 工具（已在环境核实 poppler/ghostscript 缺失，故采用浏览器内渲染方案）。
- **假设**：tesseract exe 与 tessdata 默认路径如 1.3 所述，但允许用户在设置中覆盖。

---

## 3. 功能需求

### FR1 文件导入
| 编号 | 功能 | 优先级 | 说明 |
|---|---|---|---|
| FR1.1 | 点击选择文件 | P0 | 打开系统文件对话框，支持多选；过滤 `图片(*.png;*.jpg;*.jpeg;*.tif;*.tiff;*.bmp;*.gif)` 与 `PDF(*.pdf)` |
| FR1.2 | 拖拽导入 | P0 | 拖入窗口任意区域；支持多文件；拖拽时高亮放置区 |
| FR1.3 | 文件校验 | P0 | 拒绝空文件(0 字节)、不支持的扩展名；给出友好提示 |
| FR1.4 | 文件列表管理 | P1 | 显示文件名/大小/类型/缩略图；可单个移除、清空全部 |

### FR2 文件预览
| 编号 | 功能 | 优先级 | 说明 |
|---|---|---|---|
| FR2.1 | 图片预览 | P0 | 左侧列表点击后在预览区显示原图（object URL） |
| FR2.2 | PDF 多页预览 | P0 | 用 pdfjs-dist 渲染每页为缩略图，可翻页/缩放；标注页码 |
| FR2.3 | 预览占位 | P1 | 未选中时显示引导文案与拖拽提示 |

### FR3 OCR 参数配置
| 编号 | 功能 | 优先级 | 说明 |
|---|---|---|---|
| FR3.1 | 语言多选 | P0 | 复选 eng/chi_tra/jpn/ara/heb/hin/kmr/osd/vie + 动态发现 tessdata 目录下其它包（如用户放 chi_sim）；默认 eng |
| FR3.2 | oem 选择 | P1 | 单选：LSTM(1,默认)/传统(0)/自动(3) |
| FR3.3 | psm 选择 | P1 | 下拉：自动(3)/整页(6)/稀疏文本(11)/稀疏+方向(12) 等常用项，附说明 tooltip |
| FR3.4 | 保留词间空格 | P2 | 复选 `-c preserve_interword_spaces=1`（默认开，利于排版） |
| FR3.5 | 输出格式 | P0 | 文本(txt) / 可搜索 PDF(pdf) / 两者 |

### FR4 OCR 执行
| 编号 | 功能 | 优先级 | 说明 |
|---|---|---|---|
| FR4.1 | 单文件识别 | P0 | 选中文件后点「开始识别」 |
| FR4.2 | 批量识别 | P1 | 对文件列表全部执行，顺序队列，避免并发打满 |
| FR4.3 | 进度反馈 | P0 | 每个文件显示状态：排队中/识别中(进度条)/完成/失败 |
| FR4.4 | 取消 | P1 | 终止当前子进程，清理临时文件 |
| FR4.5 | 错误隔离 | P0 | 单个文件失败不影响其它文件；显示错误原因 |

### FR5 结果展示与导出
| 编号 | 功能 | 优先级 | 说明 |
|---|---|---|---|
| FR5.1 | 文本展示 | P0 | 右侧结果区显示识别文字，等宽字体、可滚动 |
| FR5.2 | 复制 | P0 | 「复制」按钮复制全部结果到剪贴板 |
| FR5.3 | 保存 | P0 | 「保存」按钮导出 `.txt` 到用户指定目录 |
| FR5.4 | 新建文件 | P1 | 将结果作为新条目保存进会话（便于多文件结果汇总） |
| FR5.5 | 应用/插入 | P1 | 「插入」把结果回填到可编辑文本框（用户可微调后再保存） |
| FR5.6 | 导出可搜索 PDF | P1 | 若选了 pdf 输出，提供下载 `xxx_searchable.pdf` |
| FR5.7 | 多文件结果合并 | P2 | 批量完成后可一键导出合并文本 |

### FR6 设置
| 编号 | 功能 | 优先级 | 说明 |
|---|---|---|---|
| FR6.1 | Tesseract 路径 | P0 | 默认 `…\.sw\out\154291\google.tesseract.tesseract-main.exe`，可浏览修改并持久化 |
| FR6.2 | Tessdata 目录 | P0 | 默认 `…\tessdata_unittest\tessdata`，可修改 |
| FR6.3 | 输出目录 | P1 | 默认系统临时目录/用户文档下 `ocr-output` |
| FR6.4 | 配置持久化 | P0 | 设置存于用户配置（Electron: app.getPath('userData')；Web 版: localStorage） |

---

## 4. 非功能需求

| 类别 | 要求 |
|---|---|
| 性能 | 单页 A4 300DPI 图片 OCR < 5s（取决于机器）；UI 操作响应 < 100ms；PDF 渲染与 OCR 不阻塞主线程 |
| 可用性 | 拖拽区明显；首次启动有引导；错误用中文友好提示，不暴露原始堆栈 |
| 兼容性 | 支持常见图片格式；PDF 1.4–1.7；中英文混排 |
| 安全 | 纯本地，无网络上传；子进程参数做转义防注入；临时文件用完即删 |
| 可维护性 | 前端/后端分层；类型共享；单一职责；关键逻辑有单测 |
| 国际化 | 界面中文为主（本期）；文案集中管理便于后续英文化 |
| 可靠性 | tesseract 崩溃/超时（>60s）自动终止并提示；不残留僵尸进程 |

---

## 5. UI/UX 需求

### 5.1 布局
三栏响应式：
- **左栏（文件）**：导入区 + 文件列表（缩略图 + 状态徽标）。
- **中栏（预览 + 配置）**：预览画布（图片/PDF 多页）+ 参数表单 + 「开始识别」按钮。
- **右栏（结果）**：结果文本区 + 工具栏（复制/保存/新建/插入/导出 PDF）+ 状态条。

### 5.2 视觉规范
- 专业克制：中性灰底 + 单主色（如蓝 #2563EB）+ 圆角卡片；避免花哨。
- 统一间距栅格（8px 倍数）；等宽字体显示结果（如 `Consolas`/`JetBrains Mono`）。
- 暗/亮色可选（本期至少亮色）。
- 状态色：排队=灰，进行=蓝(动效)，成功=绿，失败=红。

### 5.3 交互细节
- 拖拽悬停：放置区边框高亮 + 半透明遮罩。
- 大文件/多页：缩略图懒加载，避免卡顿。
- 所有破坏性操作（清空、取消）有二次确认。

---

## 6. 数据需求

### 6.1 输入
- 图片：PNG/JPEG/TIFF/BMP/GIF（二进制）。
- PDF：单/多页；前端渲染为 PNG（分辨率默认 200–300 DPI 可调）。

### 6.2 输出
- `result.txt`：纯文本（UTF-8，LF）。
- `result_searchable.pdf`：tesseract `--pdf` 生成（图片层 + 文字层）。
- 临时文件：`%TEMP%/ocr-<uuid>/` 存放上传图、PDF 渲染页、tesseract 中间产物，任务结束删除。

### 6.3 配置数据
```json
{
  "tesseractPath": "D:\\Work_Area\\AI\\tesseract\\.sw\\out\\154291\\google.tesseract.tesseract-main.exe",
  "tessdataDir": "D:\\Work_Area\\AI\\tesseract\\tessdata_unittest\\tessdata",
  "outputDir": "D:\\Users\\<user>\\Documents\\ocr-output",
  "defaultLanguages": ["eng"],
  "oem": 1,
  "psm": 6,
  "preserveSpaces": true,
  "outputFormat": "both"
}
```

---

## 7. 验收标准
1. 能拖入一张英文 PNG，预览正常，点识别后右侧出现正确英文文本，复制/保存可用。
2. 能拖入一个 3 页 PDF，预览显示 3 页缩略图，识别后输出合并文本与可搜索 PDF。
3. 选择 chi_tra 后能正确识别繁体中文图片（需用户先放入 chi_sim/chi_tra 包）。
4. 拖入不支持的文件（如 .docx）或 0 字节文件，给出友好拒绝提示，不崩溃。
5. 修改设置中的 tesseract 路径为错误值后识别，提示「找不到 Tesseract 程序」而非白屏。
6. 单元测试 + 集成测试 + E2E 全绿（见 `05` 文档第 7 节测试方案）。

---

## 8. 待确认项
- **交付形态**：本期定为「本地 Web 应用（Vite+React 前端 + Node/Express 后端，浏览器访问）」，后续可无缝套 Electron 壳打包成独立 exe。若坚持要独立桌面 exe 优先，请在评审时提出。
- **PDF 方案**：采用浏览器内 pdfjs-dist 渲染（已确认本机无 poppler/ghostscript），若未来要求更高保真可改装 poppler。
