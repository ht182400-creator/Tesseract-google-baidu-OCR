/**
 * OCR 配置项的可选项元数据：标签 + 详细解释。
 * 集中放在此处，供 ConfigPanel 渲染「勾选卡片 + 解释」，避免散落在 UI 代码中。
 */
import type { PreprocessMode, OutputFormat } from './types';

/** 单选卡片选项通用结构 */
export interface OptionInfo<T extends string | number> {
  value: T;
  label: string;
  desc: string;
}

/** 引擎模式（oem）：0-3 */
export const OEM_OPTIONS: OptionInfo<number>[] = [
  {
    value: 1,
    label: '1 - 仅 LSTM（推荐）',
    desc: '使用神经网络 LSTM 引擎，识别率最高、最稳定，绝大多数场景首选。',
  },
  {
    value: 0,
    label: '0 - 传统引擎',
    desc: 'Tesseract 3 旧识别引擎，仅含旧模型，对现代字体/复杂版面识别率较低，一般不推荐。',
  },
  {
    value: 2,
    label: '2 - LSTM + 传统',
    desc: '同时加载两套引擎按需用，速度慢、内存占用高，仅在特殊兼容需求下使用。',
  },
  {
    value: 3,
    label: '3 - 默认',
    desc: '由 Tesseract 自行选择（通常等效于 LSTM），无需显式指定。',
  },
];

/** 页面分割模式（psm）：0-13，选错是识别率低的主因之一 */
export const PSM_OPTIONS: OptionInfo<number>[] = [
  { value: 0, label: '0 - 仅方向与脚本检测', desc: '只判断文字方向与语言，不做识别（配合 osd 语言）。' },
  { value: 1, label: '1 - 带 OSD 自动分割', desc: '先检测方向/脚本，再自动切分版面。' },
  { value: 2, label: '2 - 自动分割（无 OSD）', desc: '按版面自动分行分块，不检测文字方向。' },
  { value: 3, label: '3 - 全自动（默认）', desc: '最通用的自动布局分析，适合排版正常的整页文档。' },
  { value: 4, label: '4 - 单列可变大小', desc: '假设文本为单列、行高不一（如票据、收据）。' },
  { value: 5, label: '5 - 垂直单列', desc: '竖排文字（如古籍、日文竖排）。' },
  { value: 6, label: '6 - 整页统一为一块', desc: '把整页当作一个文本块，适合排版规整的文档/截图。' },
  { value: 7, label: '7 - 单行文本', desc: '图片只有一行字（如标题、标签、路牌）。' },
  { value: 8, label: '8 - 单个词', desc: '图片只有一个词（如图标文字、按钮）。' },
  { value: 9, label: '9 - 单字符', desc: '图片只有一个字符，适合验证码、车牌单字切分。' },
  { value: 10, label: '10 - 单个词（环形）', desc: '环绕排列的单词（如徽标、印章）。' },
  { value: 11, label: '11 - 稀疏文本', desc: '图中零散文字、彼此无行列关系（如带 Logo 的图）。' },
  { value: 12, label: '12 - 稀疏文本 + 方向', desc: '稀疏文字且需判断每行方向。' },
  {
    value: 13,
    label: '13 - 原始行（无分割）',
    desc: '把整图当作一行原始文本，跳过版面分析。注意：此模式不产生行/块坐标，「位置对应」视图将不可用。',
  },
];

/** 图像预处理模式（仅前端生效）：改善低对比度/彩色背景/拍照件识别率 */
export const PREPROCESS_OPTIONS: OptionInfo<PreprocessMode>[] = [
  { value: 'none', label: 'none - 原图直传', desc: '不做任何处理，适合扫描清晰、对比良好的图。' },
  { value: 'grayscale', label: 'grayscale - 灰度化', desc: '转灰度后送入识别，去掉色彩干扰，速度略快。' },
  { value: 'binarize', label: 'binarize - 二值化（Otsu）', desc: '自动阈值转黑白，显著提升低对比度/彩色背景/拍照件。' },
  { value: 'enhance', label: 'enhance - 对比度拉伸', desc: '增强明暗反差，改善发灰、光线不均的图。' },
];

/** 输出格式 */
export const OUTPUT_OPTIONS: OptionInfo<OutputFormat>[] = [
  { value: 'txt', label: '纯文本', desc: '只输出识别文字，体积小、便于复制粘贴。' },
  { value: 'pdf', label: '可搜索 PDF', desc: '在原图上嵌入可选择文字层，便于存档与检索。' },
];

/** 语言代码 → 名称与说明（鼠标悬停查看） */
export const LANG_INFO: Record<string, { name: string; desc?: string }> = {
  ara: { name: '阿拉伯语', desc: '从右到左书写的阿拉伯文。' },
  chi_sim: { name: '简体中文', desc: '简体中文识别；中文图片务必勾选此项。' },
  chi_tra: { name: '繁体中文', desc: '繁体中文（台湾/香港常用字形）。' },
  eng: { name: '英语', desc: '英文/拉丁字母，最常作为辅助语言（如 chi_sim+eng）。' },
  heb: { name: '希伯来语', desc: '从右到左书写的希伯来文。' },
  hin: { name: '印地语', desc: '天城文书写的印地语。' },
  jpn: { name: '日语', desc: '平假名/片假名/汉字混合的日文。' },
  kmr: { name: '库尔德语', desc: '拉丁字母书写的库尔德语。' },
  kor: { name: '韩语', desc: '谚文（Hangul）书写的韩语。' },
  osd: { name: '方向/脚本检测', desc: '仅检测文字方向与脚本，需配合 PSM 0/1，非语言文字。' },
  vie: { name: '越南语', desc: '带声调符号的拉丁字母越南语。' },
};
