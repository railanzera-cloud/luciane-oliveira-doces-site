$ErrorActionPreference="Stop"
Write-Host "=== INSTALAÇÃO LOCAL: LUCIANE COZINHA ===" -ForegroundColor Cyan
Write-Host "Este agente roda no Windows, não depende da aba do Chrome e não modifica o site."
$destination=Join-Path $env:LOCALAPPDATA "LucianeKitchenAgent\app"
[void](New-Item -ItemType Directory -Force -Path $destination)
Copy-Item (Join-Path $PSScriptRoot "Worker.ps1") (Join-Path $destination "Worker.ps1") -Force
Copy-Item (Join-Path $PSScriptRoot "config.public.json") (Join-Path $destination "config.public.json") -Force
$worker=Join-Path $destination "Worker.ps1"
Write-Host "Primeiro será solicitado o login autorizado do painel comercial."
& "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File $worker setup
if($LASTEXITCODE -ne 0){throw "Falha na autenticação. Agente NÃO foi iniciado."}
$startup=[Environment]::GetFolderPath("Startup")
$shortcut=Join-Path $startup "Luciane - Cozinha Automatica.lnk"
$shell=New-Object -ComObject WScript.Shell
$link=$shell.CreateShortcut($shortcut)
$link.TargetPath="$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$link.Arguments="-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File " + [char]34 + $worker + [char]34 + " run"
$link.WorkingDirectory=$destination
$link.WindowStyle=7
$link.Description="Agente local de impressão Luciane (início de sessão)"
$link.Save()
Start-Process -FilePath $link.TargetPath -ArgumentList $link.Arguments -WindowStyle Hidden
Write-Host ""
Write-Host "INSTALADO. O agente iniciará quando este usuário entrar no Windows." -ForegroundColor Green
Write-Host "NÃO coloque o notebook para suspender. A tela pode desligar se a suspensão estiver em 'Nunca'."
Write-Host "Verifique Status.cmd depois de 20 segundos. Sem pedidos de teste automáticos."
