@echo off
chcp 65001 >nul
cd /d "%~dp0\.."
if not exist tests\logs mkdir tests\logs
for /f %%a in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set TS=%%a
set LOG=tests\logs\test_log_%TS%.log
echo [test-all] 日志文件: %LOG%
set FORCE_COLOR=1
echo ===== 单元 + 集成测试 ===== >> "%LOG%" 2>&1
call npm test >> "%LOG%" 2>&1
echo ===== E2E 测试 ===== >> "%LOG%" 2>&1
call npm run test:e2e >> "%LOG%" 2>&1
echo [test-all] 完成，详见 %LOG%
