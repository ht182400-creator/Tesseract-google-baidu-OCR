$dir = 'D:\Work_Area\AI\tesseract\ocr-tool'
Start-Process -FilePath 'cmd.exe' -ArgumentList "/c cd /d $dir && npm run start > $dir\server.log 2>&1" -WindowStyle Hidden
Start-Sleep -Seconds 6

Write-Host '=== health ==='
& curl.exe -s http://localhost:3001/api/health
Write-Host ''
Write-Host '=== languages ==='
& curl.exe -s http://localhost:3001/api/languages
Write-Host ''
Write-Host '=== ocr (phototest.tif) ==='
$params = '{"languages":["eng"],"oem":1,"psm":6,"preserveSpaces":false,"outputFormat":"txt"}'
& curl.exe -s -F "params=$params" -F "files=@$dir\tests\fixtures\phototest.tif" http://localhost:3001/api/ocr
Write-Host ''

# 清理：按命令行特征终止 server/index.ts 相关进程
Get-CimInstance Win32_Process | Where-Object {
  ($_.CommandLine -like '*server/index.ts*') -or ($_.CommandLine -like '*tsx*' -and $_.CommandLine -like "*$dir*")
} | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Write-Host 'server stopped'
