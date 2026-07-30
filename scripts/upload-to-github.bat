@echo off
chcp 65001 >nul
cd /d "%~dp0\.."

set "REMOTE_URL=https://github.com/ht182400-creator/Tesseract-google-baidu-OCR"
set "BRANCH=ocr-upload"
REM 禁用交互式凭据提示（无尾随空格，否则 git 报 bad boolean）；凭据由 Windows 凭据管理器/GCM 提供
set "GIT_TERMINAL_PROMPT=0"
REM 强制使用 manager 凭据助手（绕过全局空值 credential.https://github.com.helper= 的短路）
set "GIT_CRED_HELPER=-c credential.https://github.com.helper=manager"

echo ============================================================
echo  OCR 工具源码上传脚本
echo  目标: %REMOTE_URL%
echo  方式: 孤立分支（单次提交，不含历史，便于排除大文件）
echo  排除: tessdata_* / .sw / *.exe / *.dll / *.traineddata
echo         test/ unittest/ tmp/ .codebuddy/ node_modules/
echo ============================================================
echo.

REM 1. 重建孤立分支（不携带历史，且不影响原有 main）
git branch -D %BRANCH% 2>nul
git checkout --orphan %BRANCH%
git rm -r --cached . >nul 2>&1

REM 2. 加入全部源码（受 .gitignore 约束自动排除大文件/依赖）
git add -A

REM 3. 兜底移除用户明确要排除的目录（含可能的 gitlink 子模块）
git reset -q -- test unittest tmp .codebuddy 2>nul

REM 4. 提交
git commit -m "OCR 工具(ocr-tool)源码与 Tesseract 相关源码（已排除大文件/依赖/测试数据）"

REM 5. 推送（--force 需显式传入，避免误覆盖远端已有历史）
if "%1"=="--force" (
  echo.
  echo [!] 使用 --force 推送，将覆盖远端 main 的已有历史。
  git %GIT_CRED_HELPER% push --force %REMOTE_URL% %BRANCH%:main
) else (
  echo.
  echo 尝试常规推送；若远端已有提交且历史无关会失败，可加 --force 重跑：
  echo   upload-to-github.bat --force
  git %GIT_CRED_HELPER% push %REMOTE_URL% %BRANCH%:main
)

echo.
echo 完成。返回原分支：git checkout main
