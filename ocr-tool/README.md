# OCR 图形化工具（ocr-tool）

基于仓库内已构建的 Tesseract 可执行文件，提供的**谷歌 / 百度 OCR 图形化工具**：支持图片 / PDF 多页识别、可搜索 PDF 导出、复制 / 保存文本、进度与「取消」、错误提示等完整闭环。

- **在线仓库**：<https://github.com/ht182400-creator/Tesseract-google-baidu-OCR>
- **需求 / 架构 / 测试库文档**：见仓库根目录 `docs/04_OCR工具_需求书.md`、`docs/05_OCR工具_架构设计与构建方案.md`、`docs/06_OCR工具_测试库.md`

## 技术栈
- 前端：Vite + React + TypeScript
- 后端：Node + Express（通过 `child_process.spawn` 调用 Tesseract 可执行文件）
- PDF 在前端用 `pdfjs-dist` 浏览器内栅格化（无需 poppler / ghostscript）

## 目录结构
- `src/`：前端 React 应用（store、components、lib）
- `server/`：Express 后端（ocrService、routes、configService）
- `tests/`：单元 / 集成 / E2E 测试（`scripts/test-all.bat` 一键全量并生成带时间戳日志）
- `docs/`：机器可读测试用例库 `06_测试库_cases.json`

## 快速启动
仓库根目录 `ocr-tool/` 下提供三个批处理（均 `chcp 65001` 避免中文乱码）：

| 脚本 | 作用 |
| --- | --- |
| `start-backend.bat` | 仅启动后端（默认 `:3001`） |
| `start-frontend.bat` | 仅启动前端（默认 `:5173`） |
| `start.bat` | 前后端一起启动（`npm run dev`） |

依赖安装：`npm install`（前端与后端同仓，根 `package.json` 统一管理）。

## 构建与测试
- 类型检查：`npm run typecheck`
- 全量测试（单元 + 集成 + E2E，生成带时间戳日志到 `tests/logs/`）：`scripts/test-all.bat`
- 当前状态：单元 23 + 集成 5 + E2E 3 = **31/31 全绿**（新增白名单校验与 TSV 位置解析单测）

## 运行前配置（克隆仓库后必做）
本工具依赖仓库内**已构建的 Tesseract 可执行文件**，但构建产物（`.sw/` 目录、`.exe`、`.dll`、`tessdata`）**已被 `.gitignore` 排除，不会进入 Git**。因此克隆他人仓库后，`ocr-tool/ocr-tool.config.json` 里的路径是**提交者的本地绝对路径**，你必须改成自己的：

- `tesseractPath`：指向你本地构建出的 `tesseract.exe`（例如仓库内 `.sw/out/<构建号>/tesseract.exe`）
- `tessdataDir`：指向语言包目录（例如 `tessdata_unittest/tessdata/`）

若路径不正确，后端启动会报"找不到可执行文件 / 语言包"。请按本机实际路径修改该 JSON 后再启动。

## 识别率优化与位置对应（核心能力）

识别率低通常不是引擎问题，而是**参数与图像质量**问题。本工具在配置面板提供以下增强：

- **字符白名单**：限定输出字符集（如 `0123456789`、车牌字符集）。发票号、车牌、验证码、纯数字等固定字符集场景，可显著抑制误识、提升准确率。留空表示不限制。后端经 `tessedit_char_whitelist` 注入，并做了字符集校验（仅允许字母/数字/空格/常见标点/Unicode 文字，超限或含控制字符会拒绝）。
- **图像预处理**（前端 canvas，不改分辨率，故包围盒坐标仍有效）：
  - `grayscale` 灰度化
  - `binarize` 二值化（Otsu 自适应阈值，黑底白字/白底黑字均适用）
  - `enhance` 对比度拉伸（min-max，适合低对比度、灰蒙蒙的文档）
  - 低对比度、彩色背景、手机拍照件建议选 `binarize` 或 `enhance`。
- **PSM 全 0–13 可选**：页面分割模式选错是识别率低的主因之一。默认 `3 全自动`；单行/验证码用 `7/9`，单列用 `4`，稀疏无版面用 `11/12`，整页统一块用 `6`。
- **PDF 栅格化默认 300 DPI**（约 `scale≈4.17`，原默认 144 DPI）：文字边缘更清晰，识别率明显提升。

### 位置对应视图（解决"排列混乱 / 不知识别的是哪一段"）

后端在识别时**额外输出 TSV**（含每个文本行的像素级包围盒 `left/top/width/height/conf/text`），前端据此提供两种对应展示：

1. **预览区叠加框**：在图片上叠加半透明高亮框，每个框带序号，鼠标悬停显示该行文本。
2. **结果区「位置对应」页签**：每行显示「**原图裁剪块缩略图 + 识别文本**」，序号与预览框一一对应；点开即可知道识别内容在图上的确切位置。

另有「纯文本」页签保留原按页拼接文本（支持复制 / 下载 txt / 可搜索 PDF）。

