@echo off
chcp 65001 >nul
cd /d "%~dp0\.."
if not exist tests\logs mkdir tests\logs
for /f %%a in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set TS=%%a
set RAW=tests\logs\_raw_%TS%.log
set LOG=tests\logs\test_log_%TS%.log
echo [test-all] 原始日志: %RAW%
echo [test-all] 合规日志: %LOG%
set FORCE_COLOR=1
echo ===== 单元 + 集成测试（原始输出） ===== > "%RAW%" 2>&1
call npm test >> "%RAW%" 2>&1
echo ===== E2E 测试（原始输出） ===== >> "%RAW%" 2>&1
call npm run test:e2e >> "%RAW%" 2>&1
REM 将带 ANSI 的原始日志转为「分层 + 带时间戳 + 未通过标红」的合规日志
node scripts/gen-test-log.mjs "%RAW%" "%LOG%"
REM 由案例库 JSON 刷新对应的 Markdown 测试案例库文档（与 JSON 一一对应）
node scripts/gen-test-md.mjs
echo [test-all] 完成，合规日志见 %LOG%，案例库见 docs\06_OCR工具_测试库.md
