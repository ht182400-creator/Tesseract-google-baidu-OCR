@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 启动 OCR 后端 (Express :3001) ...
echo 健康检查: http://localhost:3001/api/health
npm run dev:server
