@echo off
chcp 65001 >nul
cd /d "%~dp0"

REM Kill any process still listening on backend port 3001 before (re)starting
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /i "LISTENING" ^| findstr ":3001 "') do taskkill /PID %%a /F >nul 2>&1
echo Killed any stale backend process on port 3001 (if present).

echo 启动 OCR 后端 (Express :3001) ...
echo 健康检查: http://localhost:3001/api/health
npm run dev:server
