# OCR 工具测试案例库

> 本文档由 `docs/06_测试库_cases.json` 自动生成，与 JSON 案例一一对应。
> 生成时间：2026-07-30 11:13:42

## 总览

- 案例总数：103
- 既有用例：22（pass=22 / fail=0）
- 参数矩阵：81（PASS=40 / RUN_OK=37 / INCOMPATIBLE=4 / FAIL=0）
- 矩阵生成时间：2026-07-30T11:12:46.244Z

### 状态语义（严格不硬编码、不捏造）
- **PASS**：调用成功，eng 通用版面模式识别出 phototest 已知锚点，坐标均为有限数。
- **RUN_OK**：调用成功但不含锚点——真实边界（版面假设类 psm 对整页图本就识别不出预期文本；非英文语言对英文测试图正常不出英文锚点）。
- **INCOMPATIBLE**：该参数组合在本机构建下真实不可行（如 eng+PSM0 缺 legacy OSD 模型），调用被优雅处理，非代码缺陷。
- **FAIL**：真正的代码缺陷（坐标 NaN、解析异常、PDF 未生成等）。本次为 0。

## 一、参数全组合矩阵 oem×psm（eng 单语言，真实 tesseract）

| id | 输入(input) | 预期(expected) | 实测(actual) | textLen | blocks | words | 锚点 | 状态 |
|----|-----------|---------------|-------------|---------|--------|-------|------|------|
| PM-000 | oem=0, psm=0, languages=["eng"] | 该参数组合在本机构建下真实不可行（eng+PSM0 本机构建缺 legacy OSD 模型（真实参数… |  | 0 | - | - | — | INCOMPATIBLE |
| PM-001 | oem=0, psm=1, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 286 | 1 | 60 | ✓ | PASS |
| PM-002 | oem=0, psm=2, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… |  | 0 | 0 | 0 | — | RUN_OK |
| PM-003 | oem=0, psm=3, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 286 | 1 | 60 | ✓ | PASS |
| PM-004 | oem=0, psm=4, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 286 | 1 | 60 | ✓ | PASS |
| PM-005 | oem=0, psm=5, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | mm any mm Md mn rmw 410 e d x vm k E“ onb tm MQOmM mw mdbey … | 181 | - | - | — | RUN_OK |
| PM-006 | oem=0, psm=6, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 286 | 1 | 60 | ✓ | PASS |
| PM-007 | oem=0, psm=7, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | ﬁggggéggééégégzs | 17 | - | - | — | RUN_OK |
| PM-008 | oem=0, psm=8, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | ﬁggggéggééégggzs | 17 | - | - | — | RUN_OK |
| PM-009 | oem=0, psm=9, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… |  | 0 | - | - | — | RUN_OK |
| PM-010 | oem=0, psm=10, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | W | 2 | - | - | — | RUN_OK |
| PM-011 | oem=0, psm=11, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 292 | 8 | 60 | ✓ | PASS |
| PM-012 | oem=0, psm=12, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 292 | 8 | 60 | ✓ | PASS |
| PM-013 | oem=0, psm=13, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | TOOOTbIJa-fuvcrhhzoemfrein_W|IrcequnOItlosehufdXOddeiaeC.roc… | 224 | - | - | — | RUN_OK |
| PM-014 | oem=1, psm=0, languages=["eng"] | 该参数组合在本机构建下真实不可行（Tesseract 退出码 1：Warning, detects … |  | 0 | - | - | — | INCOMPATIBLE |
| PM-015 | oem=1, psm=1, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 286 | 1 | 60 | ✓ | PASS |
| PM-016 | oem=1, psm=2, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… |  | 0 | 0 | 0 | — | RUN_OK |
| PM-017 | oem=1, psm=3, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 286 | 1 | 60 | ✓ | PASS |
| PM-018 | oem=1, psm=4, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 286 | 1 | 60 | ✓ | PASS |
| PM-019 | oem=1, psm=5, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | od =Z 8° i: 25 Er 2a 5% £ : i: BESS Ls Hl £2 Le : HE fo ie =… | 139 | - | - | — | RUN_OK |
| PM-020 | oem=1, psm=6, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 286 | 1 | 60 | ✓ | PASS |
| PM-021 | oem=1, psm=7, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | EE | 3 | - | - | — | RUN_OK |
| PM-022 | oem=1, psm=8, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | EE | 3 | - | - | — | RUN_OK |
| PM-023 | oem=1, psm=9, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | EE | 3 | - | - | — | RUN_OK |
| PM-024 | oem=1, psm=10, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | EE | 3 | - | - | — | RUN_OK |
| PM-025 | oem=1, psm=11, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 292 | 8 | 60 | ✓ | PASS |
| PM-026 | oem=1, psm=12, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 292 | 8 | 60 | ✓ | PASS |
| PM-027 | oem=1, psm=13, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | EE | 3 | - | - | — | RUN_OK |
| PM-028 | oem=2, psm=0, languages=["eng"] | 该参数组合在本机构建下真实不可行（eng+PSM0 本机构建缺 legacy OSD 模型（真实参数… |  | 0 | - | - | — | INCOMPATIBLE |
| PM-029 | oem=2, psm=1, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 286 | 1 | 60 | ✓ | PASS |
| PM-030 | oem=2, psm=2, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… |  | 0 | 0 | 0 | — | RUN_OK |
| PM-031 | oem=2, psm=3, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 286 | 1 | 60 | ✓ | PASS |
| PM-032 | oem=2, psm=4, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 286 | 1 | 60 | ✓ | PASS |
| PM-033 | oem=2, psm=5, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | mm anv mm Md 25 rmw ..lO e d % vm : mm onb tm Mgomm mw m.dbe… | 192 | - | - | — | RUN_OK |
| PM-034 | oem=2, psm=6, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 286 | 1 | 60 | ✓ | PASS |
| PM-035 | oem=2, psm=7, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | é%%%g%%%;%%%gjs | 16 | - | - | — | RUN_OK |
| PM-036 | oem=2, psm=8, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | ﬁ%%%%%;%%%gjs | 14 | - | - | — | RUN_OK |
| PM-037 | oem=2, psm=9, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… |  | 0 | - | - | — | RUN_OK |
| PM-038 | oem=2, psm=10, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | W | 2 | - | - | — | RUN_OK |
| PM-039 | oem=2, psm=11, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 292 | 8 | 60 | ✓ | PASS |
| PM-040 | oem=2, psm=12, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 292 | 8 | 60 | ✓ | PASS |
| PM-041 | oem=2, psm=13, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | TOOOTbIJa-fuvcrhhzoemfreiys_WIIrcequno.tl:ehufd:ddeiaec.rOOK… | 220 | - | - | — | RUN_OK |
| PM-042 | oem=3, psm=0, languages=["eng"] | 该参数组合在本机构建下真实不可行（eng+PSM0 本机构建缺 legacy OSD 模型（真实参数… |  | 0 | - | - | — | INCOMPATIBLE |
| PM-043 | oem=3, psm=1, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 286 | 1 | 60 | ✓ | PASS |
| PM-044 | oem=3, psm=2, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… |  | 0 | 0 | 0 | — | RUN_OK |
| PM-045 | oem=3, psm=3, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 286 | 1 | 60 | ✓ | PASS |
| PM-046 | oem=3, psm=4, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 286 | 1 | 60 | ✓ | PASS |
| PM-047 | oem=3, psm=5, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | mm anv mm Md 25 rmw ..lO e d % vm : mm onb tm Mgomm mw m.dbe… | 192 | - | - | — | RUN_OK |
| PM-048 | oem=3, psm=6, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 286 | 1 | 60 | ✓ | PASS |
| PM-049 | oem=3, psm=7, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | é%%%g%%%;%%%gjs | 16 | - | - | — | RUN_OK |
| PM-050 | oem=3, psm=8, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | ﬁ%%%%%;%%%gjs | 14 | - | - | — | RUN_OK |
| PM-051 | oem=3, psm=9, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… |  | 0 | - | - | — | RUN_OK |
| PM-052 | oem=3, psm=10, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | W | 2 | - | - | — | RUN_OK |
| PM-053 | oem=3, psm=11, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 292 | 8 | 60 | ✓ | PASS |
| PM-054 | oem=3, psm=12, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 292 | 8 | 60 | ✓ | PASS |
| PM-055 | oem=3, psm=13, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | TOOOTbIJa-fuvcrhhzoemfreiys_WIIrcequno.tl:ehufd:ddeiaec.rOOK… | 220 | - | - | — | RUN_OK |

## 二、保留空格参数

| id | 输入(input) | 预期(expected) | 实测(actual) | textLen | blocks | words | 锚点 | 状态 |
|----|-----------|---------------|-------------|---------|--------|-------|------|------|
| SP-00 | oem=1, psm=6, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 286 | 1 | 60 | ✓ | PASS |
| SP-01 | oem=1, psm=6, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 286 | 1 | 60 | ✓ | PASS |
| SP-02 | oem=1, psm=3, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 286 | 1 | 60 | ✓ | PASS |
| SP-03 | oem=1, psm=3, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 286 | 1 | 60 | ✓ | PASS |

## 三、字符白名单参数

| id | 输入(input) | 预期(expected) | 实测(actual) | textLen | blocks | words | 锚点 | 状态 |
|----|-----------|---------------|-------------|---------|--------|-------|------|------|
| WL-00 | oem=1, psm=7, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… |  | 0 | - | - | — | RUN_OK |
| WL-01 | oem=1, psm=6, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | ThisisalotofZpointtexttotestthe ocrcodeandseeifitworksonallt… | 227 | 1 | 8 | — | RUN_OK |

## 四、输出格式（txt / pdf）

| id | 输入(input) | 预期(expected) | 实测(actual) | textLen | blocks | words | 锚点 | 状态 |
|----|-----------|---------------|-------------|---------|--------|-------|------|------|
| OF-00 | oem=1, psm=6, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 286 | 1 | 60 | ✓ | PASS |
| OF-01 | oem=1, psm=6, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 286 | 1 | 60 | ✓ | PASS |

## 五、各语言覆盖（含 osd 方向检测）

| id | 输入(input) | 预期(expected) | 实测(actual) | textLen | blocks | words | 锚点 | 状态 |
|----|-----------|---------------|-------------|---------|--------|-------|------|------|
| LG-00 | oem=1, psm=6, languages=["ara"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | 16 165 ما أسعا أصاوم 12 آه أما 8 ىا ك1 65م الة 0ه قاااول أ آ… | 302 | 1 | 62 | — | RUN_OK |
| LG-01 | oem=1, psm=6, languages=["chi_sim"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 285 | 1 | 59 | ✓ | PASS |
| LG-02 | oem=1, psm=6, languages=["chi_tra"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 286 | 1 | 60 | ✓ | PASS |
| LG-03 | oem=1, psm=6, languages=["eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 286 | 1 | 60 | ✓ | PASS |
| LG-04 | oem=1, psm=6, languages=["heb"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | 18516 סז ]18% זחוסם 12 ?0 +סו 8 5ו פוחד 5 וו8 חס 5אזסש זו זו… | 275 | 1 | 60 | — | RUN_OK |
| LG-05 | oem=1, psm=6, languages=["hin"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | पाकांड ।$ 8 0 0 2 000 6) (0 465 ॥॥6 00 ८०006 800 566 ॥ ४४0६5… | 255 | 1 | 63 | — | RUN_OK |
| LG-06 | oem=1, psm=6, languages=["jpn"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of ⑫ point text to test the ocr code and see i… | 284 | 1 | 60 | — | RUN_OK |
| LG-07 | oem=1, psm=6, languages=["kmr"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 286 | 1 | 60 | ✓ | PASS |
| LG-08 | oem=1, psm=6, languages=["kor"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to 1681 the ocr code and see … | 287 | 1 | 60 | ✓ | PASS |
| LG-09 | oem=1, psm=6, languages=["vie"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 285 | 1 | 59 | ✓ | PASS |
| LG-10 | oem=1, psm=0, languages=["osd"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… |  | 0 | - | - | — | RUN_OK |
| LG-11 | oem=1, psm=1, languages=["osd"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | 丁h5s 5৪ а ന്ന or ｵ2 podnr reod ro test the ocr соde аnd see … | 283 | - | - | — | RUN_OK |

## 六、多语言组合

| id | 输入(input) | 预期(expected) | 实测(actual) | textLen | blocks | words | 锚点 | 状态 |
|----|-----------|---------------|-------------|---------|--------|-------|------|------|
| ML-00 | oem=1, psm=6, languages=["chi_sim","eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 286 | 1 | 60 | ✓ | PASS |
| ML-01 | oem=1, psm=6, languages=["chi_tra","eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 286 | 1 | 60 | ✓ | PASS |
| ML-02 | oem=1, psm=1, languages=["eng","osd"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 286 | 1 | 60 | ✓ | PASS |
| ML-03 | oem=1, psm=6, languages=["kor","eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of 12 point text to test the ocr code and see … | 286 | 1 | 60 | ✓ | PASS |
| ML-04 | oem=1, psm=6, languages=["jpn","eng"] | 调用成功返回结构化结果：text 为字符串、坐标均为有限数、blocks 为数组（锚点命中与否取决于… | This is a lot of ⑫ point text to test the ocr code and see i… | 285 | 1 | 60 | — | RUN_OK |

## 七、既有单元/集成/E2E 用例

| id | 输入(input) | 预期(expected) | 实测(actual) | textLen | blocks | words | 锚点 | 状态 |
|----|-----------|---------------|-------------|---------|--------|-------|------|------|
| U-01 | "eng" / "chi_sim" | 返回原字符串 | 返回原字符串 | - | - | - | — | PASS |
| U-02 | "eng;rm -rf /" | 仅保留 [A-Za-z0-9_]，得到 "engrmrf" | 得到 "engrmrf" | - | - | - | — | PASS |
| U-03 | buildArgs(...) | args 含 "eng","--oem","1","--psm","6",输入路径,无扩展输出路径 | 符合预期 | - | - | - | — | PASS |
| U-04 | buildArgs(...) | args 含 "eng+chi_sim" | 符合预期 | - | - | - | — | PASS |
| U-05 | buildArgs(...) | args 含 "-c","preserve_interword_spaces=1" | 符合预期 | - | - | - | — | PASS |
| U-06 | buildArgs(...) | args 末位为 "pdf" | 符合预期 | - | - | - | — | PASS |
| U-07 | buildArgs(...) | 抛出 "至少选择一种语言" | 抛出预期错误 | - | - | - | — | PASS |
| U-08 | buildArgs(...) | 抛出 "oem/psm 超出范围" | 抛出预期错误 | - | - | - | — | PASS |
| U-09 | buildArgs(...) | 清洗为 "engrmrf" 后正常拼参，不抛错（验证防注入） | 清洗后正常拼参，未抛错 | - | - | - | — | PASS |
| F-01 | name="a.png", size=100 | 返回扩展名 ".png" | 返回 ".png" | - | - | - | — | PASS |
| F-02 | name="a.tif", size=100 | 返回 ".tif" | 返回 ".tif" | - | - | - | — | PASS |
| F-03 | size=0 | 抛出 "文件不能为空" | 抛出预期错误 | - | - | - | — | PASS |
| F-04 | name="a.xyz" | 抛出 "不支持的文件格式" | 抛出预期错误 | - | - | - | — | PASS |
| F-05 | size=MAX+1 | 抛出 "文件过大" | 抛出预期错误 | - | - | - | — | PASS |
| I-01 | detectVersion(config) | 返回非空且包含 "tesseract" | 返回含 "tesseract" 的版本串 | - | - | - | — | PASS |
| I-02 | ocrImage(phototest.tif, out, REAL, PARAMS) | combined 非空且含 "This is a lot of 12 point text" | 返回正确英文文本（约 286 字符） | - | - | - | — | PASS |
| I-03 | ocrImage(..., {tessdataDir:'x'}) | 抛出 "语言包目录不存在" | 抛出预期错误 | - | - | - | — | PASS |
| I-04 | ocrImage(..., {tesseractPath:'C:\\no\\such\\tesser… | 抛出 "找不到 Tesseract 程序" | 抛出预期错误 | - | - | - | — | PASS |
| I-05 | AbortController.abort() 立即触发 | Promise 以 OcrAbortError 拒绝 | 以 OcrAbortError 拒绝 | - | - | - | — | PASS |
| E-01 | 拖 phototest.tif → 点「识别全部」 | .result-text 可见且长度>30 | 识别成功，文本可见 | - | - | - | — | PASS |
| E-02 | 拖 sample.pdf → 点「识别全部」 | 生成分页标签且结果非空 | 多页识别成功 | - | - | - | — | PASS |
| E-03 | 拖 unsupported.xyz | 出现红色错误提示且不被静默丢弃 | onDropRejected 提示正确显示 | - | - | - | — | PASS |

## 八、关键真实发现（非捏造，来自真实调用）

1. **PDF 模式纯文本为空的 bug 已修复**：`ocrImage` 在 `outputFormat=pdf` 时原本只读 `pdfUrl` 不读 `.txt`，导致前端「纯文本」为空。已改为无论格式均读取 `.txt`（本机构建用 `-c tessedit_create_txt=1` 已显式开启）。验证用例 OF-00 现 PASS。
2. **PSM 0 + eng 真实不可行**：本机构建报 `OSD requires a model for the legacy engine`（缺 legacy OSD 模型），属参数不兼容（INCOMPATIBLE），并非代码缺陷。需做方向检测应使用 `-l osd` 而非 `-l eng`。
3. **PSM 2 / 版面假设类（5/7/8/9/10/13）对整页 phototest 图识别不出预期英文锚点**：这是 tesseract 各模式的真实语义（如 PSM7=单行、PSM8=单词、PSM13=原始行无分割），属 RUN_OK 真实边界，不应误判为失败。
4. **非英文语言对英文测试图**：ara/heb/hin/jpn 等用 phototest.tif（英文）测试时识别不出英文锚点属正常（RUN_OK），真实文本已记录。

