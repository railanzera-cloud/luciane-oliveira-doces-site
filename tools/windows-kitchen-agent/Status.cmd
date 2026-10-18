@echo off
chcp 65001 >nul
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%LOCALAPPDATA%\LucianeKitchenAgent\app\Worker.ps1" status
echo.
echo Ultimas linhas do registro local:
powershell.exe -NoProfile -Command "Get-Content -Path (Join-Path $env:LOCALAPPDATA 'LucianeKitchenAgent\agent.log') -Tail 12 -ErrorAction SilentlyContinue"
echo.
pause
