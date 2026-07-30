# Tesseract 测试指南

> 适用版本：5.5.3
> 更新日期：2026-07-30
> 参考：`unittest/CMakeLists.txt`、`unittest/README.md`、`.github/workflows/cmake.yml`、`appveyor.yml`

本文说明如何构建并运行 Tesseract 的测试。Tesseract 的测试分为**单元测试（GoogleTest）**和**端到端/冒烟测试（命令行跑真实图）**两种。

---

## 一、测试体系总览

### 1.1 单元测试（GoogleTest）
位于 `unittest/*.cc`（73+ 个用例），用 gtest 覆盖各模块。按 `unittest/CMakeLists.txt` 分组：

- **`TRAINING_TESTS`**：训练相关，需要 `BUILD_TRAINING_TOOLS=ON`。
  例：`lstm_test.cc`、`lstm_recode_test.cc`、`lstm_squashed_test.cc`、`unicharset_test.cc`、`unichar_test.cc`、`unicharcompress_test.cc`、`validator_test.cc`、`validate_grapheme_test.cc`、`dawg_test.cc`、`normstrngs_test.cc`。
- **`PANGO_TESTS`**：文字渲染相关，需要 `PANGO_FOUND`（Pango 开发库）。
  例：`pango_font_info_test.cc`、`stringrenderer_test.cc`、`ligature_table_test.cc`。
- **`LEGACY_TESTS`**：传统识别引擎，定义 `DISABLED_LEGACY_ENGINE` 时自动剔除。
  例：`osd_test.cc`、`equationdetect_test.cc`、`applybox_test.cc`、`params_model_test.cc`、`textlineprojection_test.cc`。

其余常见用例：`baseapi_test.cc`（公共 API）、`apiexample_test.cc`、`capiexample_test.cc`、`resultiterator_test.cc`、`recodebeam_test.cc`、`networkio_test.cc`、`lang_model_test.cc`、`rect_test.cc`、`heap_test.cc`、`matrix_test.cc`、`stats_test.cc`、`intsimdmatrix_test.cc`（SIMD）、`tablefind_test.cc`、`tablerecog_test.cc`、`layout_test.cc` 等。

### 1.2 端到端 / 冒烟测试
直接用构建出的 `tesseract` 对 `test/testing/` 下的真实测试图（`phototest.tif`、`raaj.tif`、`viet.tif`、`arabic.tif`、`hebrew.png`、`eurotext.tif` 等）做识别，验证整条管线。

---

## 二、前置准备（关键，缺一不可）

### 2.1 初始化 gtest 子模块
单元测试依赖 `unittest/third_party/googletest`（见 `CMakeLists.txt:878`）：
```bash
git submodule update --init --recursive
```

### 2.2 下载测试数据与字体
语言包与字体来自社区仓库 `egorpugin/tessdata`：
```bash
git clone https://github.com/egorpugin/tessdata tessdata_unittest --depth 1
cp tessdata_unittest/fonts/* test/testing/
# 放到仓库根目录（测试宏 TESSDATA_DIR/LANGDATA_DIR 指向 <仓库>/tessdata、<仓库>/langdata_lstm）
mv tessdata_unittest/tessdata      ./
mv tessdata_unittest/tessdata_best ./      # 可选（best 模型）
mv tessdata_unittest/tessdata_fast ./      # 可选（fast 模型）
mv tessdata_unittest/langdata_lstm ./
```
> `unittest/CMakeLists.txt:23-27` 将 `TESSDATA_DIR` 定义为 `<src>/tessdata`、`LANGDATA_DIR` 定义为 `<src>/langdata_lstm`。LSTM 类测试需要 `tessdata/eng.traineddata` 等，缺失会跳过或失败。

### 2.3 ⚠️ 必须注意：Windows 下克隆测试数据会被 CRLF 污染（已踩坑）

`tessdata_unittest` **本身是一个 git 仓库**。在 Windows 上若用默认 `core.autocrlf=true` 克隆，所有**文本文件会被自动转成 CRLF**，导致两类"假失败"：

1. `test/testing/phototest.gold.txt`（在 `test` 子模块内）被转 CRLF，与 Tesseract 的 LF 输出逐行 diff 失败（`baseapi_test` 失败）。
2. `tessdata_unittest/langdata_lstm/radical-stroke.txt` 每行末带 `\r`，被 `src/ccutil/unicharcompress.cpp:DecodeRadicalLine` 按空格切分后 `strtol("3\r",...)` 解析失败 → 打印 `Invalid format in radical table` → `lang_model` / `recodebeam` / `unicharcompress` 全部失败。

**正确做法**（二选一）：
```bash
# 方式 A：克隆时关闭 autocrlf（推荐）
git -c core.autocrlf=false clone https://github.com/egorpugin/tessdata tessdata_unittest

# 方式 B：克隆后整体去 CRLF（对所有文本文件 CRLF→LF，含 NUL 的二进制跳过）
# 见 03 文档 15.5 节，已用脚本批量处理 langdata_lstm
```
> 注意 `test` 是 git 子模块，`phototest.gold.txt` 的修复必须在**子模块内**处理（已加 `test/.gitattributes`：`/testing/phototest.gold.txt eol=lf`），不能从父仓库 `git checkout`。

---

## 三、构建并运行单元测试

### 3.1 CMake（推荐，跨平台）
```bash
cmake -S . -B build -G Ninja \
      -DCMAKE_BUILD_TYPE=Release \
      -DBUILD_TESTS=ON \
      -DBUILD_TRAINING_TOOLS=ON
cmake --build build
cd build
ctest --output-on-failure          # 运行全部 gtest
```
- 顶层开关 `BUILD_TESTS`（默认 OFF，`CMakeLists.txt:101`）。
- 单用例直接运行：`./unittest/lstm_test`、`c test/unittest/baseapi_test`。
- Windows 上若用 MSVC，去掉 `-G Ninja` 即可生成 VS 工程。

### 3.2 Autotools（Linux/macOS）
```bash
autoreconf -fiv
git submodule update --init
./configure
make
make check                        # 编译并运行全部单元测试
```

### 3.3 Windows（AppVeyor 实际用法）
CI（`appveyor.yml`）使用 **Software Network (`sw`)** 依赖/构建管理器：
```powershell
git submodule update --init --recursive
sw -platform Win64 -config r build -Dwith-tests=1
git clone https://github.com/egorpugin/tessdata tessdata_unittest
Copy-Item tessdata_unittest\fonts\* test\testing\ -Recurse
sw -platform Win64 -config r test -Dwith-tests=1 -Dskip-tests=lstm,lstm_recode
```
若用标准 CMake + vcpkg 安装 `leptonica/libarchive/icu/pango` 后，同样以 `-DBUILD_TESTS=ON` 构建、`ctest` 运行。

---

## 四、端到端冒烟测试 & 识别自己的图片 / PDF

### 4.1 构建产物里的可执行文件

SW 构建出的主程序位于 **`D:\Work_Area\AI\tesseract\.sw\out\154291\google.tesseract.tesseract-main.exe`**（dll 同目录）。下文用 `$TESS` 指代它，用 `$TESSD` 指代语言包目录：

```powershell
$TESS = "D:\Work_Area\AI\tesseract\.sw\out\154291\google.tesseract.tesseract-main.exe"
$TESSD = "D:\Work_Area\AI\tesseract\tessdata_unittest\tessdata"   # 含 eng/chi_tra/jpn/ara/... 
# 或 tessdata_best（含 eng/fra 等 best 模型）：D:\Work_Area\AI\tesseract\tessdata_unittest\tessdata_best
```

> 也可用 `cmake --build build && ctest` 体系产出的 `tesseract.exe`，命令完全一致，只是路径不同。

### 4.2 识别自带图片（最常用）

```bash
# 英文图片 → 输出到终端
$TESS D:\path\to\myimage.png - --oem 1 --tessdata-dir $TESSD -l eng

# 中文图片（仓库自带只有 chi_tra 繁体；简体需另下 chi_sim）
$TESS D:\path\to\chinese.png - --oem 1 --tessdata-dir $TESSD -l chi_tra

# 输出到文件（默认加 .txt）
$TESS D:\path\to\myimage.jpg result --oem 1 --tessdata-dir $TESSD -l eng
# → 生成 result.txt

# 保留版面（按图片自然排布输出，适合多栏/带格式扫描件）
$TESS D:\path\to\scan.pdf result --oem 1 --psm 6 --tessdata-dir $TESSD -l eng
```

常用参数速记：
- `--oem 1`：LSTM 引擎（5.x 默认且推荐）；`--oem 0` 传统引擎（需 legacy 模型）。
- `-l <lang>`：语言，多语言用 `+` 连接，如 `-l eng+chi_tra`。
- `--psm N`：页面分割模式。`--psm 6`=假设整页统一块；`--psm 3`=全自动（默认）；`--psm 11`=稀疏文本/无版面；`--psm 12`=含方向信息的稀疏文本。
- `-c preserve_interword_spaces=1`：保留词间空格（对排版敏感场景有用）。

### 4.3 识别 PDF

Tesseract **不能直接吃 PDF 二进制**（5.x 没有内置 PDF 栅格化）。需分两步：先把 PDF 转成图片，再 OCR。

**方案 A：用 Poppler 的 `pdftoppm`（推荐，最省事）**
```bash
# 1) PDF 每页转 PNG（需先安装 poppler-utils，或 conda/pip install pdf2image + poppler）
pdftoppm -r 300 -png D:\path\to\doc.pdf D:\tmp\page
# → 生成 page-1.png, page-2.png, ...

# 2) 逐页 OCR（可用脚本批处理）
for %f in (D:\tmp\page-*.png) do (
  $TESS "%f" "%~nf" --oem 1 --psm 6 --tessdata-dir $TESSD -l eng
)
```

**方案 B：Ghostscript 转图**
```bash
gswin64c -dNOPAUSE -dBATCH -sDEVICE=png16m -r300 -sOutputFile=D:\tmp\page-%03d.png D:\path\to\doc.pdf
```

**方案 C：让 Tesseract 输出可搜索 PDF（`pdf` 后缀）**
```bash
# 输入是图片时，把输出后缀写成 .pdf，Tesseract 会生成"图层 PDF"（原图 + 隐藏文本层）
$TESS D:\path\to\scan.png searchable --oem 1 --psm 6 --tessdata-dir $TESSD -l eng pdf
# → 生成 searchable.pdf（可被选中/搜索文字）
```
> 注意：这是"图片包成 PDF"，不是"读已有 PDF"。要 OCR 一个**已有 PDF 文件**，必须先按方案 A/B 转成图片。

### 4.4 仓库自带测试图（验证管线）

来自 `.github/workflows/cmake.yml` / `test/testing/`：
```bash
$TESS test/testing/phototest.tif - --oem 1 --tessdata-dir $TESSD -l eng
$TESS test/testing/raaj.tif    - -l hin --oem 1 --tessdata-dir $TESSD
$TESS test/testing/viet.tif    - -l vie --oem 1 --tessdata-dir $TESSD
$TESS test/testing/hebrew.png  - -l heb --oem 1 --tessdata-dir $TESSD
$TESS test/testing/eurotext.tif - -l fra --oem 1 --tessdata-dir tessdata_best
$TESS test/testing/arabic.tif  - -l ara --oem 1 --psm 6 --tessdata-dir $TESSD
```

---

## 五、API 示例测试（basicapitest）

`test/testing/basicapitest.cpp` 是 C++ API 端到端示例，需链接已安装的 `libtesseract`：
```bash
g++ -o basicapitest test/testing/basicapitest.cpp \
    -Iinst/include -Linst/lib \
    $(pkg-config --cflags --libs tesseract lept libarchive libcurl) \
    -pthread -std=c++17
./basicapitest
```

---

## 六、测试内容速查表

| 关注点 | 对应测试文件 |
|--------|--------------|
| LSTM 引擎 / 解码 | `lstm_test.cc`、`lstm_recode_test.cc`、`lstm_squashed_test.cc`、`recodebeam_test.cc`、`networkio_test.cc` |
| 公共 API | `baseapi_test.cc`、`apiexample_test.cc`、`capiexample_test.cc`、`resultiterator_test.cc` |
| 字符集 / Unicode | `unicharset_test.cc`、`unichar_test.cc`、`unicharcompress_test.cc`、`normstrngs_test.cc` |
| 字典 / 语言模型 | `dawg_test.cc`、`lang_model_test.cc` |
| 参数系统 | `params_model_test.cc`、`commandlineflags_test.cc`、`pagesegmode_test.cc` |
| 版面 / 表格 | `tablefind_test.cc`、`tablerecog_test.cc`、`colpartition_test.cc`、`layout_test.cc` |
| 几何 / 工具 | `rect_test.cc`、`heap_test.cc`、`matrix_test.cc`、`stats_test.cc`、`list_test.cc` |
| SIMD 加速 | `intsimdmatrix_test.cc` |
| 传统引擎 | `osd_test.cc`、`equationdetect_test.cc`、`applybox_test.cc`（仅 legacy 构建） |

---

## 七、最小可复现流程

```
git submodule update --init --recursive
# 关键：关闭 autocrlf 克隆测试数据，否则 CRLF 污染导致 baseapi/lang_model 等假失败（见 2.3）
git -c core.autocrlf=false clone https://github.com/egorpugin/tessdata tessdata_unittest
Copy-Item tessdata_unittest\fonts\* test\testing\ -Recurse
用 -DBUILD_TESTS=ON 构建
ctest --output-on-failure      # 单元测试
$TESS test/testing/*.tif …     # 冒烟测试 / 自己的图片
```

权威参考：CI 全部命令见 `.github/workflows/`（cmake.yml、unittest.yml、cmake-win64.yml、unittest-disablelegacy.yml 等）与 `appveyor.yml`。

---

## 八、当前构建与测试状态（2026-07-30）

- 本仓库已用 SW 在 Windows 构建完成，主程序：`D:\Work_Area\AI\tesseract\.sw\out\154291\google.tesseract.tesseract-main.exe`。
- 测试数据已克隆至 `tessdata_unittest`（含 `tessdata/`、`tessdata_best/`、`langdata_lstm/`），并已完成 CRLF 修复。
- 单元测试最终成绩：**TOTAL=59, PASS=58, FAIL=0, OTHER=1**（排除 `lstm*` 系列，其需 LSTM 模型 CI 亦跳过）。详见 `03_SW构建编译问题与解决方案汇总.md` 第 15 节。
- 语言包现状：`tessdata` 含 `ara/chi_tra/eng/heb/hin/jpn/kmr/osd/vie`；`tessdata_best` 含 `eng/fra/kmr/osd`。**简体中文 `chi_sim`、日文已含 `jpn`、韩文 `kor` 等需另行下载**放入对应目录即可使用。
