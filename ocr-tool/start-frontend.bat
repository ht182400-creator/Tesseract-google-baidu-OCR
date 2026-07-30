@echo off
chcp 65001 >nul
cd /d "%~dp0"

REM Kill any process still listening on frontend port 5173 before (re)starting
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /i "LISTENING" ^| findstr ":5173 "') do taskkill /PID %%a /F >nul 2>&1
echo Killed any stale frontend process on port 5173 (if present).

echo 启动 OCR 前端 (Vite :5173) ...
echo 浏览器打开: http://localhost:5173
npm run dev:web
