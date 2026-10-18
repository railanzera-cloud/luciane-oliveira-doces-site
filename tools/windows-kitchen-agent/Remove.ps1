$ErrorActionPreference="Stop"
$startup=Join-Path ([Environment]::GetFolderPath("Startup")) "Luciane - Cozinha Automatica.lnk"
if(Test-Path $startup){Remove-Item -LiteralPath $startup -Force}
$statusFile=Join-Path $env:LOCALAPPDATA "LucianeKitchenAgent\status.json"
if(Test-Path $statusFile){
 try{
  $pidNumber=[int]((Get-Content $statusFile -Raw|ConvertFrom-Json).pid)
  $process=Get-CimInstance Win32_Process -Filter ("ProcessId="+$pidNumber)
  if($process -and $process.CommandLine -match 'LucianeKitchenAgent.*Worker\.ps1'){
   Stop-Process -Id $pidNumber -Force
   Write-Host "Processo de impressão encerrado."
  }
 }catch{Write-Host "Verifique se o agente ainda está rodando no Gerenciador de Tarefas."}
}
Write-Host "Inicialização automática removida. A fila de pedidos no Supabase foi preservada."
$ans=Read-Host "Apagar também a sessão protegida do Windows? (SIM para confirmar)"
if($ans -ceq "SIM"){
 $auth=Join-Path $env:LOCALAPPDATA "LucianeKitchenAgent\auth.dpapi"
 if(Test-Path $auth){Remove-Item -LiteralPath $auth -Force}
 Write-Host "Sessão local excluída. Pedidos e Supabase não foram alterados."
}
