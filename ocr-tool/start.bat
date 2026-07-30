@echo off
chcp 65001 >nul
cd /d "%~dp0"

REM Kill any processes still listening on backend (3001) and frontend (5173) ports before (re)starting
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /i "LISTENING" ^| findstr ":3001 "') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /i "LISTENING" ^| findstr ":5173 "') do taskkill /PID %%a /F >nul 2>&1
echo Killed any stale backend (3001) / frontend (5173) processes (if present).

echo 启动 OCR 工具 (后端 :3001 + 前端 :5173)
echo 浏览器打开: http://localhost:5173
echo 按 Ctrl+C 停止全部
npm run dev
