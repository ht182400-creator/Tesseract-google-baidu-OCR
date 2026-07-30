@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 启动 OCR 工具 (后端 :3001 + 前端 :5173)
echo 浏览器打开: http://localhost:5173
echo 按 Ctrl+C 停止全部
npm run dev
