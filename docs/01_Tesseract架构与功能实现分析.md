# Tesseract OCR 引擎架构与功能实现分析

> 源码版本：5.5.3（当前仓库 `VERSION` 文件）
> 分析日期：2026-07-29
> 许可证：Apache License 2.0
> 主要语言：C++（约 490 个 `src/*.cpp`，227 个 `src/*.h`）

---

## 一、项目概述

Tesseract 是一个开源的**光学字符识别（OCR）引擎**：

- **历史渊源**：源自 1985~1994 年 HP 实验室的引擎，2006 年 Google 接手开源，并引入 **LSTM 神经网络**识别引擎（4.x 起）。5.x 版本以 LSTM 为主，传统（legacy）引擎默认已退化/可在编译期禁用（`DISABLED_LEGACY_ENGINE`）。
- **能力**：支持 100+ 种语言，提供命令行工具 `tesseract` 与可嵌入的 C/C++ 库 `libtesseract`。
- **外部依赖**：图像处理依赖 **Leptonica**（`pix` 数据结构贯穿全局）；辅助依赖 libarchive、giflib、libtiff、libpng、zlib、ICU（Unicode）、可选 Cairo/Pango（训练时渲染文字）。
- **运行模型**：输入一张图像（或页面）＋ 语言包（`tessdata`），输出文本/结构化结果（hOCR、ALTO、tsv、PDF、box 等）。

---

## 二、目录结构与分层架构

源码主体位于 `src/`，按职责严格分层。顶层 `include/tesseract/` 仅暴露公共头文件。

| 目录 | 职责 | 关键文件 / 类 |
|------|------|---------------|
| `include/tesseract/` | 公共 API 头文件（对外导出） | `baseapi.h` `capi.h` `publictypes.h` `renderer.h` `ocrclass.h` |
| `src/api/` | 公共 API 实现（`TessBaseAPI` 的薄封装） | `baseapi.cpp` `capiextern.cpp` `renderer.cpp` |
| `src/ccmain/` | **主控制层**：串联版面分析→识别→输出 | `control.cpp` `tesseractclass.h` `pageiterator.cpp` `resultiterator.cpp` `applybox.cpp` `output.cpp` |
| `src/textord/` | **版面分析 / 文本排序**：把图像切成块/行/词 | `textord.cpp` `colfind.cpp` `blockline.cpp` `makerow.cpp` |
| `src/ccstruct/` | **核心数据结构**：块、行、词、轮廓、字符集、结果 | `ocrblock.h`(BLOCK) `ocrrow.h`(ROW) `werd.h`(WERD) `blobs.h`(C_BLOB/PBLOB) `unichar.h`(UNICHAR) `pageres.h`(PAGE_RES/WERD_RES) |
| `src/lstm/` | **LSTM 神经网络识别引擎**（现代主力） | `lstmrecognizer.cpp` `network.cpp` `lstm.cpp` `weightmatrix.cpp` `recodebeam.cpp` |
| `src/classify/` | legacy 字符分类器（特征提取＋原型匹配） | `intfx.cpp` `mfoutline.cpp` `intproto.cpp` `intmatcher.cpp` `adaptive.cpp` |
| `src/wordrec/` | legacy 单词识别（分割搜索＋语言模型） | `wordrec.cpp` `chop.cpp` `findseam.cpp` `segsearch.cpp` `language_model.cpp` |
| `src/dict/` | 词典 / 语言模型（有向无环词图 Dawg） | `dict.cpp` `dawg.cpp` `trie.cpp` |
| `src/ccutil/` | 通用工具：参数系统、错误码、tessdata 管理、索引映射 | `params.h` `tessdatamanager.h` `indexmap.h` `errcode.h` `unicharset.h` `helpers.h` |
| `src/arch/` | 架构相关 SIMD 加速（点积 / 量化矩阵乘） | `dotproduct.cpp` `intsimdmatrix.cpp` `simddetect.cpp` |
| `src/cutil/` | 早期 C 风格工具函数 | `bitvec.c` `stderr_message.c` `emalloc.c` |
| `src/training/` | 训练工具集（模型/字符集生成） | `lstmtraining.cpp` `lstmeval.cpp` `mftraining.cpp` `combine_tessdata.cpp` `text2image.cpp` |
| `src/viewer/` | ScrollView 调试可视化 | `scrollview.cpp` `svmnode.cpp` |
| `src/ccstruct/` 等中的 `*natvis` | VS 调试可视化 | — |

**分层关系示意**：

```
tesseract (CLI) ─┐
                 ├─> api/baseapi (TessBaseAPI) ─> ccmain/control (Tesseract)
tesseract (库) ─┘                                      │
                                                       ▼
                                            textord (版面分析: BLOCK/ROW/WERD)
                                                       │
                          ┌────────────────────────────┴───────────────────────────┐
                          ▼                                                          ▼
                 lstm/  (LSTMRecognizer)                              classify+wordrec+dict  (legacy)
                          │                                                          │
                          └────────────── 结果汇总到 PAGE_RES/WERD_RES ◄─────────────┘
                                          │
                                          ▼
                          ccmain/output + renderer (文本/hOCR/tsv/PDF…)
```

---

## 三、构建系统

Tesseract **同时维护两套构建系统**（历史遗留）：

- **CMake**：`CMakeLists.txt` + `cmake/*.cmake`。现代推荐方式。`cmake/` 下定义了依赖查找（Leptonica、ICU、训练工具用 Pango 等）与 `DISABLED_LEGACY_ENGINE` 等开关。
- **Autotools**：`configure.ac` + `Makefile.am` + `m4/`。老式方式，仍可用。
- 构建产品：可执行文件 `tesseract`、共享库 `libtesseract`、`training/` 下的训练二进制；语言包 `tessdata/*.traineddata` 需单独下载安装。

> **本仓库实际构建状态（2026-07-30）**：已用 SW 在 Windows 完成构建。主程序位于 `D:\Work_Area\AI\tesseract\.sw\out\154291\google.tesseract.tesseract-main.exe`（dll 同目录）；测试数据已克隆到 `tessdata_unittest/`（`tessdata/`、`tessdata_best/`、`langdata_lstm/`）。单元测试最终成绩 **PASS=58 / FAIL=0 / OTHER=1（TOTAL=59，排除 lstm*）**。语言包现状：`tessdata` 含 `ara/chi_tra/eng/heb/hin/jpn/kmr/osd/vie`，`tessdata_best` 含 `eng/fra/kmr/osd`；`chi_sim`/`kor` 等需另行下载。详见 `02_Tesseract测试指南.md` 与 `03_SW构建编译问题与解决方案汇总.md`。

---

## 四、公共接口层（`include/tesseract/`）

对外仅暴露少量稳定接口，是二次开发入口：

- **`baseapi.h` — `TessBaseAPI`**：最核心类。
  - 初始化：`Init(const char* datapath, const char* language, OcrEngineMode mode = OEM_DEFAULT, ...)` 加载 `tessdata/<lang>.traineddata`。
  - 设置图像：`SetImage(...)`（支持 `Pix*`、内存位图、`TessBaseAPI::SetImage` 多重载）、`SetSourceResolution`、`SetRectangle`（ROI）。
  - 识别：`Recognize(ETEXT_DESC*)`。
  - 迭代结果：`GetIterator()` 返回 `ResultIterator*`；`GetUTF8Text()`、`GetHOCRText()`、`GetTSVText()`、`GetALTOText()`、`GetPDFText()`、`GetWordStrBoxText()` 等。
  - 参数：通过 `Get*Variable` / `SetVariable` 读写。
- **`publictypes.h`**：关键枚举
  - `OcrEngineMode`（OEM）：`OEM_TESSERACT_ONLY`(legacy)、`OEM_LSTM_ONLY`、`OEM_TESSERACT_LSTM_COMBINED`、`OEM_DEFAULT`。
  - `PageSegMode`（PSM）：`PSM_AUTO`(全自动)、`PSM_SINGLE_BLOCK`、`PSM_SINGLE_LINE`、`PSM_SINGLE_WORD`、`PSM_SINGLE_CHAR`、`PSM_SPARSE_TEXT`、`PSM_OSD_ONLY`(方向检测) 等 14 种。
  - `PageIteratorLevel`：结果层级 `RIL_BLOCK/RIL_PARA/RIL_TEXTLINE/RIL_WORD/RIL_SYMBOL`。
- **`renderer.h`**：输出渲染器抽象基类 `TessResultRenderer` 及子类（`TessTextRenderer`、`TessHOcrRenderer`、`TessTSVRenderer`、`TessPDFRenderer`、`TessBoxRenderer`、`TessUnlvRenderer`、`TessWordStrBoxRenderer`、`TessAltoRenderer`），支持 `AddBox`, `BeginDocument/EndDocument` 流式写入。
- **`capi.h`**：纯 C API（`TessBaseAPI` 以 `void*` 句柄暴露），供非 C++ 语言绑定。

---

## 五、CLI 入口（`src/tesseract.cpp`）

`tesseract.cpp` 是命令行程序：

1. 解析命令行：`tesseract <image> <outputbase> [-l lang] [--oem N] [--psm N] [configs...] [tessedit_...]`
2. 用 `ParamUtils` / `tesseract::InitParams` 装载 `.` 配置文件与命令行变量。
3. 创建 `tesseract::TessBaseAPI`，`Init` 后 `SetImage`（经 Leptonica 读图）。
4. 循环 `ProcessPages`（可处理多页/多图），调用各 `Get*Text` 写出结果。
5. 全程通过 `ccutil::tprintf` / 错误码处理异常，结束后 `End()` 释放。

---

## 六、核心识别管线（`ccmain/control.cpp` + `tesseractclass.h`）

`TessBaseAPI::RecognizeInternal` → `Tesseract::Recognize` 是中枢，编排如下（见 `control.cpp`、`tesseract.cpp` 中的 `Tesseract::Recognize`）：

1. **页面预处理**：图像二值化、去倾斜/旋转矫正、OSD（方向/脚本检测，`OsdListener`）。由 `ImageThresholder`（在 `ccstruct/image.h`、`imagedata.h`）完成灰度/二值化数据准备。
2. **版面分析（Pass 0）**：调用 `textord` 把页面切成 `BLOCK → ROW → WERD`（详见第七节）。初步切块后可做表格/列检测（`colfind.cpp`）。
3. **识别 Pass1 / Pass2**：
   - `RecognizePass1`：对全页做初步识别，并统计字体尺寸（x-height）等信息。
   - `RecognizePass2`：基于 Pass1 的统计量（如基准行高）重新拟合、微调，提高精度。
   - 关键分支（见 `control.cpp:78` `recog_interactive`）：若 `lstm_recognizer_ != nullptr` 则只跑 pass1（LSTM 不依赖 pass2 的 legacy 适配）；否则调用 `classify_word_and_language(2, ...)` 走 legacy 双 pass。
4. **结果收集**：把每行识别结果挂到 `PAGE_RES`（页面结果树），包含每个 `WERD_RES`（单词结果：候选、评分、符号切分）。
5. **写出**：`ResultIterator` 遍历 `PAGE_RES`，经 `renderer` 输出多种格式。

> 注意：`Recognize` 默认把图像按行（textline）交给识别器；行级识别是 LSTM 与 legacy 的共同工作单元（见 `lstmrecognizer.cpp:RecognizeLine`）。

---

## 七、文本版面分析（`src/textord/`）

`textord` 模块负责**把像素变成有结构的文本行**：

- 输入：二值化后的 `Pix` + 连通分量（blobs，`ccstruct/blobbox.cpp` 的 `BLOBNBOX`）。
- 过程：
  1. 连通分量分组 → 估算文本方向、列数（`colfind.cpp`：彩色/表格列检测）。
  2. 找文本行（baseline、x-height、行间距）→ 生成 `ROW`（`makerow.cpp`、`blockline.cpp`）。
  3. 把行组织成 `BLOCK`（`TO_BLOCK`、`Textord` 类）。
  4. 行内再切成 `WERD`（单词）。
- 输出数据结构（定义在 `ccstruct/`）：`BLOCK → ROW → WERD` 三层树，作为下游识别器的输入单元。
- 关键类：`Textord`、`TO_BLOCK`、`BLOCK`、`ROW`；并配合 `ccstruct/ocrpara.h`(段落)、`ocrrow.h`(行)。

---

## 八、核心数据结构（`src/ccstruct/`）

这是全工程的"数据语言"，所有模块都围绕它们协作：

- **`BLOCK`（ocrblock.h）**：页面逻辑块（段落/表格/图片区），含旋转矩阵 `re_rotation_`、`classify_rotation_`、`skew_`，以及 `ROW` 列表，标注是否比例字体、字距/词距。
- **`ROW`（ocrrow.h）**：一行文本，含基线 `baseline`、x-height、行内单词列表。
- **`WERD`（werd.h）**：一个单词，包含若干 `PBLOB`（符号轮廓块）及 `UNICHAR_ID`。
- **`PBLOB` / `C_BLOB`（blobs.h）**：单词/符号的轮廓表示。`C_BLOB` 是带轮廓（outer + holes）的基本连通块，`PBLOB` 是其带位置信息的封装。轮廓由 `COUTLN`（coutln.h）多边形描述，支持多边形近似、合并、拆分（用于字符切分）。
- **`UNICHAR`（unichar.h）/ `UNICHARSET`（unicharset.h，位于 ccutil）**：Unicode 字符封装与全局字符集；`UNICHAR_ID` 是字符在字符集中的整数索引，是引擎内部的"字符 token"。
- **`WERD_RES`（pageres.h）**：单词识别结果，包含候选 `BLOB_CHOICE`、评分 `ratngs.h`、切分、符号选择、reject 标志；`PAGE_RES` 是整页的 `WERD_RES` 树。
- **`Image` / `ImageData`（image.h / imagedata.h）**：对 Leptonica `Pix` 的封装，提供像素访问、缩放、ROI。
- **`Normalis`（normalis.h）**：字符归一化（旋转/缩放为固定标准框），供识别前规范化输入。

---

## 九、LSTM 神经网络引擎（重点，`src/lstm/`）

这是现代 Tesseract 的主力识别器，`lstmrecognizer.cpp` 的 `LSTMRecognizer` 是顶层行识别器。

### 9.1 网络即"组合模式"

所有网络层继承自 `Network` 基类（`network.h`），通过子类型组合成完整网络：

- **`Series`**（series.h）：顺序串联若干层。
- **`Parallel`**（parallel.h）：并行分支。
- **`Plumbing`**（plumbing.h）：更通用的多输入多输出组合。
- 具体层类型：
  - **`Input`**（input.cpp）：把 `Pix` 转成网络输入（按高度归一化、提取灰度/梯度特征）。`PrepareLSTMInputs` 是关键入口。
  - **`Convolve`**（convolve.cpp）：1D 卷积（时间维卷积，提取局部形状特征）。
  - **`Maxpool`**（maxpool.cpp）：最大池化（降时间分辨率）。
  - **`FullyConnected`**（fullyconnected.cpp）：全连接层。
  - **`Reversed`**（reversed.cpp）：将序列反转，用于构造**双向 LSTM**。
  - **`LSTM`**（lstm.cpp）：长短期记忆单元，序列建模核心。
  - **`Reconfig`**（reconfig.cpp）：改变特征维度排列。
  - **`Recode`**：把网络输出标签重编码为 unichar（配合 `recoder`）。
- **`NetworkIO`**（networkio.h）：层间传递的"张量"，约定 `Width=时间步`，`Height=特征数`，`Depth=批/通道`。`Forward` 沿网络前向传播。
- **`WeightMatrix`**（weightmatrix.h）：权重存储，使用 **int8 量化 + 查表（LUT）** 加速推理（`functions.cpp`/`generate_lut.py` 生成激活 LUT）。`IntSimdMatrix`（`arch/`）做量化矩阵乘的 SIMD 加速。
- 网络由 `Network::CreateFromFile(fp)`（lstmrecognizer.cpp:135）从 `tessdata` 的 `TESSDATA_LSTM` 组件反序列化构建。

### 9.2 识别主流程（`LSTMRecognizer::RecognizeLine`）

两阶段实现（`lstmrecognizer.cpp:247` 与 `:320`）：

1. **前向推理**（`:320` `RecognizeLine` 内部）：
   - `Input::PrepareLSTMInputs` 准备输入图像（按 `network_->XScaleFactor()` 宽度规格化）。
   - `Input::PreparePixInput` 生成 `NetworkIO inputs`。
   - `network_->Forward(debug, inputs, nullptr, &scratch_space_, outputs)` 得到每时间步的字符类概率 `outputs`。
   - **自动反相（inversion）**：若 `OutputStats` 判定前景/背景可能反了（`pos_mean < invert_threshold`），则对图像反相再跑一次前向，择优（":349" 起）。
2. **解码**（`:247` `RecognizeLine`）：
   - 构造 `RecodeBeamSearch`（recodebeam.cpp），传入 `recoder_`、`null_char_`、词典 `dict_`。
   - `search_->Decode(outputs, kDictRatio=2.25, kCertOffset=-0.085, worst_dict_cert, ...)`：基于 **CTC 风格的 beam search**，结合词典打分选最优字符序列。
   - `search_->ExtractBestPathAsWords(line_box, scale_factor, ...)`：把最优序列按字符边界切成 `WERD_RES` 单词结果，回填坐标。
   - 若开启 `lstm_choice_mode`，还会 `DecodeSecondaryBeams` + `segmentTimestepsByCharacters` 提取每个符号的多候选与时间点（`CTC_symbol_choices`、`segmented_timesteps`）。

> 关键常量（lstmrecognizer.cpp:46-48）：`kDictRatio=2.25`（词典词相对非词典词的分数倍率）、`kCertOffset=-0.085`（给词典的确定性偏移）。

### 9.3 训练

- **`lstmtraining`**：用标注文本/box 训练或微调 LSTM（支持 `--net_spec` 自定义网络、checkpoint、`continue_from`）。
- **`lstmeval`**：在测试集上评估模型精度。
- 训练图用 `text2image`（依赖 Pango）渲染。

---

## 十、Legacy 识别引擎（`classify/` + `wordrec/` + `dict/`）

> 默认情况下 5.x 已不启用；如未定义 `DISABLED_LEGACY_ENGINE` 且选 `OEM_TESSERACT_ONLY` 才生效。

- **`classify/` — 字符分类**：
  - 特征提取：整型特征 `intfx.cpp`、微特征轮廓 `mfoutline.cpp`/`mfx.cpp`、pico 特征 `picofeat.cpp`、归一化特征 `normfeat.cpp`、外围特征 `outfeat.cpp`；`featdefs.cpp` 统一定义特征集。
  - 原型匹配：`intproto.cpp`（整数化原型）、`intmatcher.cpp`（快速整型匹配）、`kdtree.cpp`（k-d 树检索）。
  - 自适应：`adaptive.cpp`/`adaptmatch.cpp`（在线学习用户字体）。
- **`wordrec/` — 单词识别**：
  - 分割：`chop.cpp`/`chopper.cpp`（字符切分）、`findseam.cpp`（找切缝）、`segsearch.cpp`（分割搜索）、`associate.cpp`。
  - 语言模型：`language_model.cpp`/`lm_state.cpp`/`lm_pain_points.cpp`/`lm_consistency.cpp`，用动态规划在切分与词典间择优。
- **`dict/` — 词典**：`dawg.cpp`（Directed Acyclic Word Graph 压缩词典）、`trie.cpp`、断词/标点规则。

---

## 十一、基础工具层

### 11.1 `ccutil/` — 参数与数据管理
- **参数系统**（`params.h`）：`BoolParam`/`IntParam`/`DoubleParam`/`StringParam` + `Param` 注册表。所有可调超参（如 `tessedit_pageseg_mode`、`lstm_choice_mode`）都以全局/命名参数形式声明，可在运行时通过 `SetVariable` 修改，也可由配置文件装载。这是 Tesseract "配置驱动" 的核心机制。
- **`TessdataManager`**（`tessdatamanager.h`）：读取/解析 `*.traineddata`（多组件归档文件），按 `TessdataType`（`TESSDATA_LSTM`、`TESSDATA_LANG_MODEL`、`TESSDATA_UNICHARSET`…）定位各组件流。
- `IndexMap`/`UnicityTable`：ID↔字符串 映射，用于字符集、字体名去重。
- `tprintf`：线程安全的日志打印（替代 `printf`）。
- `errcode.h`：统一错误码与 `DO_NOTHING`/`ABORT` 宏。

### 11.2 `arch/` — SIMD 加速
- `dotproduct.cpp`、`intsimdmatrix.cpp`：点积/量化矩阵乘，自动检测并分发到 **SSE / AVX / AVX2 / AVX512 / NEON**（ARM）实现（`simddetect.cpp`）。LSTM 的 int8 权重乘加在此处获得数倍加速。
- 量化策略：权重存为 `int8`，运行期用 `IntSimdMatrix::Multiply` 做定点乘加并反量化，兼顾精度与速度。

### 11.3 `cutil/` — 早期 C 工具
- `bitvec.c`（位向量）、`emalloc.c`（带错误检查的分配）、`stderr_message.c` 等，部分仍被历史代码使用。

---

## 十二、词典与语言模型（`src/dict/`）

- **Dawg（Directed Acyclic Word Graph）**：压缩存储词典，避免海量字符串占用内存。Tesseract 维护多种 Dawg：系统词（`sys`）、用户词（`user`）、高频词（`freq`）、数字（`number`）。
- 作用：在 LSTM 的 `RecodeBeamSearch` 与 legacy 的 `language_model` 中作为语言约束，提升长词/专有名词准确率。
- 可由 `wordlist2dawg.cpp` 从词表生成，或 `combine_tessdata` 打包进语言包。

---

## 十三、训练工具（`src/training/`）

| 工具 | 作用 |
|------|------|
| `unicharset_extractor` | 从标注样本提取字符集 `unicharset` |
| `shapeclustering` | 形状聚类（legacy 用） |
| `mftraining` / `cntraining` | 生成特征原型/字符归一化（legacy） |
| `combine_tessdata` | 把各组件打包成 `*.traineddata` |
| `combine_lang_model` | 组装 LSTM 语言模型 |
| `set_unicharset_properties` | 设置字符属性（是否标点、是否上标等） |
| `text2image` | 用 Pango 渲染训练用合成图（pango/ 子模块） |
| `lstmtraining` | 训练 / 微调 LSTM 网络 |
| `lstmeval` | 评估 LSTM 模型 |
| `dawg2wordlist` / `wordlist2dawg` | 词典与词表互转 |
| `ambiguous_words` / `classifier_tester` / `degradeimage` / `merge_unicharsets` / `mergenf` | 辅助工具 |

子模块：`training/common/`（共享逻辑）、`training/unicharset/`（字符集处理）、`training/pango/`（文字渲染）。

---

## 十四、输出渲染与结果迭代

- **`ResultIterator`**（`pageiterator.cpp`/`resultiterator.cpp`）：以层级（块→段→行→词→符）遍历 `PAGE_RES`，提供 `GetUTF8Text(LEVEL)`、`Confidence(LEVEL)`、`BoundingBox(LEVEL)`、`GetChoiceIterator`（符号多候选）。
- **`renderer.h` 系列**：把结果写成文本、hOCR（HTML）、ALTO（XML）、TSV（带坐标表格）、PDF（可搜索 PDF）、box（ground-truth 框）、UNLV、WordStrBox 等。
- 坐标体系全部基于 `ccstruct/rect.h` 的 `TBOX`，并考虑版面旋转矩阵还原到原图坐标。

---

## 十五、关键设计要点（可借鉴之处）

1. **双引擎可插拔**：`OEM` 抽象让 LSTM 与 legacy 共存，识别器以 `lstm_recognizer_` 是否为空切换（`control.cpp:82`），便于演进与回退。
2. **组合模式网络**：`Network` 的 `Series/Parallel/Plumbing` 让网络结构由数据文件描述，无需改代码即可换模型（`Network::CreateFromFile`）。
3. **量化推理 + SIMD**：int8 权重 + `IntSimdMatrix` 查表乘加，在 CPU 上高效运行 LSTM。
4. **CTC + 词典 Beam Search**：`RecodeBeamSearch` 在神经网概率输出上联合词典打分，兼顾准确率与可读性。
5. **版面分析分层**：`BLOCK→ROW→WERD` 与识别解耦，使同一识别器既能处理整页也能处理单行/单词。
6. **配置驱动参数系统**：上千个可调参数以声明式宏注册，支持运行时/配置文件覆盖，便于实验与调优。
7. **组件化语言包**：`tessdata` 多组件归档，按需加载（LSTM 权重、字符集、词典可独立存在/缺省）。

---

## 十六、关键文件速查表

| 想了解… | 看这里 |
|---------|--------|
| 对外 API | `include/tesseract/baseapi.h`, `src/api/baseapi.cpp` |
| 命令行行为 | `src/tesseract.cpp` |
| 识别主流程 | `src/ccmain/control.cpp`, `src/ccmain/tesseractclass.h` |
| 结果迭代/输出 | `src/ccmain/pageiterator.cpp`, `resultiterator.cpp`, `output.cpp` |
| 版面分析 | `src/textord/textord.cpp`, `makerow.cpp`, `colfind.cpp` |
| 数据结构 | `src/ccstruct/ocrblock.h`, `ocrrow.h`, `werd.h`, `blobs.h`, `unichar.h`, `pageres.h` |
| LSTM 顶层 | `src/lstm/lstmrecognizer.cpp`, `lstmrecognizer.h` |
| LSTM 网络层 | `src/lstm/network.cpp`, `lstm.cpp`, `convolve.cpp`, `weightmatrix.cpp` |
| 解码 | `src/lstm/recodebeam.cpp` |
| legacy 分类 | `src/classify/classify.cpp`, `intmatcher.cpp`, `intfx.cpp` |
| legacy 分词 | `src/wordrec/wordrec.cpp`, `chop.cpp`, `segsearch.cpp` |
| 词典 | `src/dict/dict.cpp`, `dawg.cpp` |
| 参数/数据 | `src/ccutil/params.h`, `tessdatamanager.h`, `unicharset.h` |
| SIMD 加速 | `src/arch/intsimdmatrix.cpp`, `dotproduct.cpp` |
| 训练 | `src/training/lstmtraining.cpp`, `text2image.cpp`, `combine_tessdata.cpp` |

---

> 注：本文基于对仓库源码（`src/`、`include/`、`CMakeLists.txt`、`README.md`、`VERSION`）的静态阅读整理，未实际编译运行。如需更深入某一模块（如 LSTM 前向实现的数学细节、版面分析的连通分量算法），可进一步定向阅读对应 `*.cpp`。
