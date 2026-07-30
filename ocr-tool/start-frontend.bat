@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 启动 OCR 前端 (Vite :5173) ...
echo 浏览器打开: http://localhost:5173
npm run dev:web
