/**
 * 测试日志生成器：把 vitest 文本报告转为「分层 + 带时间戳 + 未通过标红」的合规日志。
 * 用法：node scripts/gen-test-log.mjs <vitest文本日志路径> <输出日志路径>
 * 分层：文件级（File） / 用例级（Case） / 汇总级（Summary）。
 * 未通过用例标记 [FAIL]（红色由阅读端着色，此处用显式标记位）。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const src = process.argv[2];
const out = process.argv[3];
if (!src || !out) {
  console.error('用法: node scripts/gen-test-log.mjs <源vitest日志> <输出日志>');
  process.exit(1);
}
if (!existsSync(src)) {
  console.error('源日志不存在:', src);
  process.exit(1);
}

const raw = readFileSync(src, 'utf-8');
// 剥离 ANSI 转义序列
const clean = raw.replace(/\x1b\[[0-9;]*m/g, '');
const lines = clean.split('\n');

const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
const out2 = [];
out2.push(`==================== OCR 工具测试日志 ====================`);
out2.push(`生成时间: ${ts}`);
out2.push(`源报告: ${src}`);
out2.push(`==========================================================`);

let curFile = '';
let failCount = 0;
let passCount = 0;
let caseCount = 0;

// 用稳定的 ASCII 文本行解析，不依赖 ✓/× 等特殊字符（编码易失真）
let filePass = 0;
let fileFail = 0;
let casePass = 0;
let caseFail = 0;

for (const line of lines) {
  const fileM = line.match(/tests\/[^\s]+\.ts\s+\(\s*(\d+)\s+tests?\s*(\|\s*(\d+)\s+failed)?/);
  if (fileM) {
    const total = parseInt(fileM[1], 10);
    const failed = fileM[3] ? parseInt(fileM[3], 10) : 0;
    const ok = failed === 0;
    curFile = line.match(/tests\/[^\s]+\.ts/)[0];
    out2.push(`[File] ${ok ? 'PASS' : 'FAIL'}  ${curFile} (total=${total} failed=${failed})`);
    if (ok) { filePass++; casePass += total; } else { fileFail++; caseFail += failed; casePass += (total - failed); }
    continue;
  }
}

// 汇总（优先用 vitest 权威行）
const tfM = clean.match(/Test Files\s+(\d+)\s+failed\s*\|\s*(\d+)\s+passed\s*\((\d+)\)/)
  || clean.match(/Test Files\s+(\d+)\s+passed\s*\((\d+)\)/);
const ttM = clean.match(/Tests\s+(\d+)\s+failed\s*\|\s*(\d+)\s+passed\s*\((\d+)\)/)
  || clean.match(/Tests\s+(\d+)\s+passed\s*\((\d+)\)/);

out2.push(`----------------------------------------------------------`);
out2.push(`[Summary] 文件层: PASS=${filePass} FAIL=${fileFail}`);
out2.push(`[Summary] 用例层: PASS=${casePass} FAIL=${caseFail}`);
if (tfM) out2.push(`[Summary] ${tfM[0].trim()}`);
if (ttM) out2.push(`[Summary] ${ttM[0].trim()}`);
const finalFail = ttM ? (ttM[1] ? parseInt(ttM[1], 10) : 0) : caseFail;
out2.push(`[Summary] 未通过用例数=${finalFail} ${finalFail === 0 ? '(全部通过)' : '(请检查上方 [FAIL] 标记)'}`);
out2.push(`==========================================================`);

writeFileSync(out, out2.join('\n') + '\n', 'utf-8');
console.log(`测试日志已生成: ${out} (文件PASS=${filePass} 文件FAIL=${fileFail} 用例PASS=${casePass} 用例FAIL=${caseFail})`);
