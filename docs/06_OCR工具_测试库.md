# OCR 工具（ocr-tool）测试库

> 生成日期：2026-07-30 ｜ 对应代码：`ocr-tool/`
> 机器可读用例库（与下文一一对应）：[06_测试库_cases.json](./ocr-tool/docs/06_测试库_cases.json)

## 1. 测试策略与分层

| 层级 | 范围 | 是否依赖外部 | 运行命令 | 框架 |
|---|---|---|---|---|
| 单元测试 | 参数拼装、语言清洗、上传校验等纯逻辑 | 否 | `npm test` | Vitest |
| 集成测试 | 真实调用仓库已构建的 `tesseract.exe` + 夹具 `phototest.tif` | 是（需 `.sw/out/154291` 与 `tessdata_unittest`） | `npm test` | Vitest |
| 端到端 | 真实 Chromium 跑完整「拖拽→栅格化→识别→展示」链路 | 是（需 dev server + tesseract + pdfjs） | `npm run test:e2e` | Playwright |

配套：
- 类型检查：`npm run typecheck`（`tsc --noEmit`，`noUnusedLocals`/`noUnusedParameters` 开启）
- HTTP 冒烟：`npm run smoke`（Node 脚本，覆盖健康/语言/真实 OCR）
- 全量带日志：`scripts/test-all.bat`（生成带时间戳、失败标红的日志到 `tests/logs/`）

## 2. 运行环境与前置

- Node ≥ 18（使用 `node:child_process`、`AbortSignal` 等）
- `npm install` 已执行
- 集成测试需要：
  - `tesseract.exe` 位于 `.sw/out/154291/`（或 `ocr-tool.config.json` 中 `tesseractPath` 指向的真实路径）
  - 语言包位于 `tessdata_unittest/tessdata/`（至少含 `eng.traineddata`）
- E2E 需要：`npx playwright install chromium`；`playwright.config.ts` 会自动拉起 `npm run dev`

## 3. 用例总览（22 项，全绿）

| 统计 | 单元 | 集成 | E2E | 合计 |
|---|---|---|---|---|
| 用例数 | 14 | 5 | 3 | 22 |
| 通过 | 14 | 5 | 3 | 22 |

## 4. 详细用例

### 4.1 单元测试（ocrService）

| ID | 用例 | 前置 | 输入 | 预期 | 实际 | 状态 |
|---|---|---|---|---|---|---|
| U-01 | 合法语言代码原样返回 | 无 | `"eng"` / `"chi_sim"` | 返回原字符串 | 同预期 | PASS |
| U-02 | 注入字符被清洗 | 无 | `"eng;rm -rf /"` | 仅保留 `[A-Za-z0-9_]`，得 `"engrmrf"` | 同预期 | PASS |
| U-03 | 最小参数包含必要项 | params 默认 | `buildArgs(...)` | 含 `eng`、`--oem 1`、`--psm 6`、输入/输出路径 | 符合 | PASS |
| U-04 | 多语言以 `+` 连接 | languages 两项 | `buildArgs(...)` | 含 `"eng+chi_sim"` | 符合 | PASS |
| U-05 | 保留空格追加 `-c` | preserveSpaces=true | `buildArgs(...)` | 含 `"-c"`、`"preserve_interword_spaces=1"` | 符合 | PASS |
| U-06 | 输出 PDF 末参为 `pdf` | outputFormat="pdf" | `buildArgs(...)` | args 末位 `"pdf"` | 符合 | PASS |
| U-07 | 空语言抛错 | languages=[] | `buildArgs(...)` | 抛「至少选择一种语言」 | 抛预期错 | PASS |
| U-08 | 非法 oem/psm 抛错 | oem=99 / psm=99 | `buildArgs(...)` | 抛「oem/psm 超出范围」 | 抛预期错 | PASS |
| U-09 | 注入语言清洗后不抛错 | languages=`["eng;rm -rf /"]` | `buildArgs(...)` | 清洗为 `"engrmrf"` 后正常拼参 | 未抛错 | PASS |

### 4.2 单元测试（fileService）

| ID | 用例 | 前置 | 输入 | 预期 | 实际 | 状态 |
|---|---|---|---|---|---|---|
| F-01 | 正常 png 通过 | 无 | `a.png`, size=100 | 返回 `".png"` | 同预期 | PASS |
| F-02 | tif 格式允许 | 无 | `a.tif`, size=100 | 返回 `".tif"` | 同预期 | PASS |
| F-03 | 0 字节文件拒绝 | 无 | size=0 | 抛「文件不能为空」 | 抛预期错 | PASS |
| F-04 | 不支持格式拒绝 | 无 | `a.xyz` | 抛「不支持的文件格式」 | 抛预期错 | PASS |
| F-05 | 超大文件拒绝 | MAX_UPLOAD_BYTES 已设 | size=MAX+1 | 抛「文件过大」 | 抛预期错 | PASS |

### 4.3 集成测试（真实 tesseract）

| ID | 用例 | 前置 | 输入 | 预期 | 实际 | 状态 |
|---|---|---|---|---|---|---|
| I-01 | 版本探测可用 | tesseractPath 真实 | `detectVersion(config)` | 非空且含 `"tesseract"` | 含版本串 | PASS |
| I-02 | 识别 phototest.tif | eng 包就位 | `ocrImage(phototest.tif,...)` | combined 非空且含 `"This is a lot of 12 point text"` | 返回 ~286 字符正确文本 | PASS |
| I-03 | 错误 tessdataDir 抛错 | 目录不存在 | `ocrImage(...,{tessdataDir:'x'})` | 抛「语言包目录不存在」 | 抛预期错 | PASS |
| I-04 | 错误 tesseractPath 抛错 | exe 不存在 | `ocrImage(...,{tesseractPath:'C:\\no\\such\\tesseract.exe'})` | 抛「找不到 Tesseract 程序」 | 抛预期错 | PASS |
| I-05 | 取消：中止信号杀进程 | 真实 tesseract 可启动 | `AbortController.abort()` 立即触发 | Promise 以 `OcrAbortError` 拒绝 | 以 `OcrAbortError` 拒绝 | PASS |

### 4.4 端到端测试（Playwright）

| ID | 用例 | 前置 | 输入 | 预期 | 实际 | 状态 |
|---|---|---|---|---|---|---|
| E-01 | 拖入图片得到非空文本 | dev server + tesseract | 拖 `phototest.tif` → 点「识别全部」 | `.result-text` 可见且长度 > 30 | 识别成功 | PASS |
| E-02 | 拖入 PDF 得到分页结果 | dev server | 拖 `sample.pdf` → 点「识别全部」 | 生成分页标签且结果非空 | 多页识别成功 | PASS |
| E-03 | 拖入不支持格式显示红色拒绝 | dev server | 拖 `unsupported.xyz` | 出现红色错误提示且不被静默丢弃 | `onDropRejected` 提示正确 | PASS |

## 5. 分支与边界覆盖说明

- **防注入**：U-02/U-09 验证语言代码白名单清洗，杜绝 `; rm -rf` 类命令注入（因 `spawn` 数组式传参 + 清洗双保险）。
- **异常路径**：I-03/I-04 覆盖「程序不存在 / 语言包目录不存在」；F-03~F-05 覆盖空文件/非法格式/超大文件。
- **取消分支（M5）**：I-05 覆盖 `AbortSignal` 触发后后端杀掉子进程并以 `OcrAbortError` 拒绝；前端 `store.runOcr` 据此把状态回退为 `idle` 而非 `error`。
- **断线回收**：路由用 `res.on('close')` + `!res.writableEnded` 判定真实断线，避免 keep-alive 下误杀子进程（已通过 E-01/E-02 回归验证）。
- **E2E 全链路**：E-01/E-02 覆盖浏览器内 PDF 栅格化（pdfjs-dist）+ 多页上传 + 后端识别 + 结果展示；E-03 覆盖 UX 拒绝提示。

## 6. 测试日志

- 最新全量日志示例：`ocr-tool/tests/logs/test_log_20260730_162527.log`（单元 14 + 集成 5 全绿，E2E 3 全绿）。
- 日志由 `scripts/test-all.bat` 生成，文件名带「日期_时间」，失败项以红色 ANSI 标记（`FORCE_COLOR=1`）。
- 注：`.log`、`node_modules/`、`dist/`、`ocr-tool.config.json` 等已在 `ocr-tool/.gitignore` 忽略，不会进入版本库。

## 7. 回归与门禁

每次修改后必须：`npm run typecheck`（零错误）→ `npm test`（单元+集成全绿）→ `npm run test:e2e`（全绿）。三者全绿方可标记「完成」。
