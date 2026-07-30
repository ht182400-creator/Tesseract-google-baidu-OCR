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
- 当前状态：单元 14 + 集成 5 + E2E 3 = **22/22 全绿**
