param([ValidateSet("setup","run","status","selftest")][string]$Mode="run")
$ErrorActionPreference="Stop"
[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
$root=Join-Path $env:LOCALAPPDATA "LucianeKitchenAgent"
[void](New-Item -Path $root -ItemType Directory -Force)
$authFile=Join-Path $root "auth.dpapi"
$logFile=Join-Path $root "agent.log"
$statusFile=Join-Path $root "status.json"
$deviceFile=Join-Path $root "device.txt"
$cfg=Get-Content (Join-Path $PSScriptRoot "config.public.json") -Raw | ConvertFrom-Json
$api=([string]$cfg.supabaseUrl).TrimEnd("/")
$key=[string]$cfg.publishableKey
$printer=[string]$cfg.printerName
if($api -notmatch '^https://[A-Za-z0-9.-]+$' -or !$key.StartsWith("sb_publishable_") -or !$printer) {throw "Configuração pública inválida."}

function Log([string]$msg) {
 try {
  if((Test-Path $logFile) -and (Get-Item $logFile).Length -gt 1048576){Move-Item $logFile ($logFile+".old") -Force}
  [IO.File]::AppendAllText($logFile,([DateTimeOffset]::Now.ToString("s")+" "+$msg+[Environment]::NewLine))
 }catch{}
}
function Status([string]$state,[string]$msg) {
 @{state=$state;message=$msg;heartbeat=[DateTimeOffset]::UtcNow.ToString("o");printer=$printer;pid=$PID} |
 ConvertTo-Json -Compress | Set-Content $statusFile -Encoding UTF8
}
function StoreAuth($a){
 $json=@{access_token=$a.access_token;refresh_token=$a.refresh_token;expires_at=[long]$a.expires_at}|ConvertTo-Json -Compress
 $secure=ConvertTo-SecureString $json -AsPlainText -Force
 [IO.File]::WriteAllText($authFile,(ConvertFrom-SecureString $secure))
}
function ReadAuth {
 if(!(Test-Path $authFile)){throw "Instale e faça o login primeiro."}
 $secure=ConvertTo-SecureString ([IO.File]::ReadAllText($authFile))
 $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
 try{return ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)|ConvertFrom-Json)}
 finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
}
function Request([string]$endpoint,$data,[string]$token=""){
 $headers=@{apikey=$key}
 if($token){$headers.Authorization="Bearer "+$token}
 $body=ConvertTo-Json -InputObject $data -Depth 12 -Compress
 return Invoke-RestMethod -Uri ($api+$endpoint) -Method Post -ContentType "application/json" -Headers $headers -Body $body -TimeoutSec 20
}
function Login {
 Write-Host "LUCIANE | Configuração do agente de impressão"
 Write-Host "Digite as credenciais da mesma conta autorizada no painel."
 $email=Read-Host "E-mail"
 $secret=Read-Host "Senha (oculta)" -AsSecureString
 $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
 try{
  $password=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  $response=Request "/auth/v1/token?grant_type=password" @{email=$email;password=$password}
 }finally{$password=$null;[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
 if(!$response.access_token -or !$response.refresh_token){throw "Autenticação falhou."}
 StoreAuth @{access_token=$response.access_token;refresh_token=$response.refresh_token;expires_at=([DateTimeOffset]::UtcNow.ToUnixTimeSeconds()+[long]$response.expires_in)}
 if(!(Test-Path $deviceFile)){[IO.File]::WriteAllText($deviceFile,("lod-win-"+[guid]::NewGuid().ToString("N")))}
 Write-Host "Sessão protegida no Windows. Sua senha não foi gravada."
}
function ValidAuth {
 $s=ReadAuth
 $now=[DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
 if([long]$s.expires_at -gt ($now+120)){return $s}
 $r=Request "/auth/v1/token?grant_type=refresh_token" @{refresh_token=$s.refresh_token}
 if(!$r.access_token -or !$r.refresh_token){throw "Sessão expirada. Abra o instalador novamente."}
 $s=@{access_token=$r.access_token;refresh_token=$r.refresh_token;expires_at=($now+[long]$r.expires_in)}
 StoreAuth $s
 return $s
}

$native=@'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
public static class KitchenSpool {
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)]
 public struct Doc { [MarshalAs(UnmanagedType.LPWStr)]public string Name;
 [MarshalAs(UnmanagedType.LPWStr)]public string File;
 [MarshalAs(UnmanagedType.LPWStr)]public string Kind; }
 [DllImport("winspool.drv",EntryPoint="OpenPrinterW",CharSet=CharSet.Unicode,SetLastError=true)]
 static extern bool Open(string name,out IntPtr h,IntPtr defaults);
 [DllImport("winspool.drv",EntryPoint="StartDocPrinterW",CharSet=CharSet.Unicode,SetLastError=true)]
 static extern int StartDoc(IntPtr h,int level,ref Doc info);
 [DllImport("winspool.drv",SetLastError=true)]static extern bool StartPagePrinter(IntPtr h);
 [DllImport("winspool.drv",SetLastError=true)]static extern bool WritePrinter(IntPtr h,byte[] data,int count,out int written);
 [DllImport("winspool.drv")]static extern bool EndPagePrinter(IntPtr h);
 [DllImport("winspool.drv")]static extern bool EndDocPrinter(IntPtr h);
 [DllImport("winspool.drv")]static extern bool ClosePrinter(IntPtr h);
 [DllImport("winspool.drv",SetLastError=true)]static extern bool GetPrinter(IntPtr h,int level,IntPtr ptr,int cb,out int needed);
 static void Ensure(bool ok,string message){if(!ok)throw new Win32Exception(Marshal.GetLastWin32Error(),message);}
 public static void Check(string name){
  IntPtr h; Ensure(Open(name,out h,IntPtr.Zero),"Impressora não instalada");
  try {
   int needed=0;GetPrinter(h,6,IntPtr.Zero,0,out needed);
   if(needed>=4){
    IntPtr ptr=Marshal.AllocHGlobal(needed);
    try {
     Ensure(GetPrinter(h,6,ptr,needed,out needed),"Estado da impressora indisponível");
     int status=Marshal.ReadInt32(ptr);
     if((status & (0x80|0x10|0x08|0x01|0x100000))!=0)
      throw new InvalidOperationException("Impressora offline, pausada, sem papel ou exige intervenção");
    }finally{Marshal.FreeHGlobal(ptr);}
   }
  }finally{ClosePrinter(h);}
 }
 public static void Send(string name,byte[] bytes,string title){
  IntPtr h;Ensure(Open(name,out h,IntPtr.Zero),"Falha ao abrir impressora");
  try {
   Doc info=new Doc{Name=title,File=null,Kind="RAW"};
   int job=StartDoc(h,1,ref info);
   if(job<=0)throw new Win32Exception(Marshal.GetLastWin32Error(),"Fila recusou comanda");
   try{
    Ensure(StartPagePrinter(h),"Falha no início da página");
    try {
     int n;Ensure(WritePrinter(h,bytes,bytes.Length,out n),"Falha de escrita");
     if(n!=bytes.Length)throw new InvalidOperationException("Comanda enviada parcialmente");
    }finally{EndPagePrinter(h);}
   }finally{EndDocPrinter(h);}
  }finally{ClosePrinter(h);}
 }
}
'@
Add-Type -TypeDefinition $native -ErrorAction Stop

function Plain($v){
 if($null -eq $v){return ""}
 $s=([string]$v).Normalize([Text.NormalizationForm]::FormD)
 return ([regex]::Replace(([regex]::Replace($s,'\p{Mn}','')),'[^\x20-\x7E]',' ')-replace '\s+',' ').Trim()
}
function Wrap($v,[int]$width=32){
 $list=New-Object 'System.Collections.Generic.List[string]'
 $line=""
 foreach($raw in ((Plain $v) -split ' ')){
  if(!$raw){continue};$word=[string]$raw
  while($word.Length -gt $width){
   if($line){$list.Add($line);$line=""}
   $list.Add($word.Substring(0,$width));$word=$word.Substring($width)
  }
  if(!$word){continue}
  if(!$line){$line=$word}
  elseif(($line.Length+1+$word.Length) -le $width){$line+=" "+$word}
  else{$list.Add($line);$line=$word}
 }
 if($line){$list.Add($line)}
 return ,($list.ToArray())
}
function Cash($v){
 ([decimal]::Parse([string]$v,[Globalization.CultureInfo]::InvariantCulture)).ToString("N2",[Globalization.CultureInfo]::GetCultureInfo("pt-BR"))
}
function Receipt($claim){
 $e=[string][char]27;$g=[string][char]29
 $b=$e+"E"+[char]1;$n=$e+"E"+[char]0
 $c=$e+"a"+[char]1;$l=$e+"a"+[char]0
 $big=$g+"!"+[char]17;$regular=$g+"!"+[char]0
 $d="--------------------------------"
 $o=$claim.order
 $date=([DateTimeOffset]::Parse([string]$o.created_at)).ToOffset([TimeSpan]::FromHours(-3)).ToString("dd/MM/yyyy HH:mm")
 $kind=if($o.fulfillment_type -eq "pickup"){"RETIRADA"}else{"ENTREGA"}
 $payment="PEDIDO CONFIRMADO"
 if($o.payment_status -eq "paid"){
  if($o.payment_method -in @("manual_pix","mercado_pago_pix")){$payment="PIX CONFIRMADO"}
  elseif($o.payment_method -eq "mercado_pago_card"){$payment="CARTAO ONLINE CONFIRMADO"}
  else{$payment="PAGAMENTO CONFIRMADO"}
 }
 $lines=New-Object 'System.Collections.Generic.List[string]'
 $lines.Add($e+"@"+$c+$b+"LUCIANE OLIVEIRA DOCES"+$n)
 $lines.Add($big+"PEDIDO #"+$o.order_number+$regular)
 if($claim.job.kind -eq "reprint"){$lines.Add($b+"*** REIMPRESSAO ***"+$n)}
 $lines.Add($date);$lines.Add($l+$d);$lines.Add($c+$b+$kind+$n)
 $lines.Add($payment);$lines.Add($l+$d);$lines.Add("")
 foreach($it in @($claim.items)){
  $isSlice=(Plain $it.size_label) -match '^1 fatia$'
  $name=[string]$it.quantity+"x "+$(if($isSlice){"FATIA - "}else{""})+[string]$it.name
  if(!$isSlice -and $it.size_label){$name+=" "+$it.size_label}
  $lines.Add($b+((Wrap $name) -join [Environment]::NewLine)+$n)
  foreach($opt in @($it.option_names)){
   if($null -ne $opt){
    $prefix=if($isSlice){"> "}else{"+ "}
    foreach($part in (Wrap ($prefix+$opt))){$lines.Add($part)}
   }
  };$lines.Add("")
 }
 $lines.Add($d);$lines.Add($b+"CLIENTE"+$n)
 $customer=if($o.customer_name){$o.customer_name}else{"Nao informado"}
 $lines.Add($b+$big+((Wrap $customer 16) -join [Environment]::NewLine)+$regular+$n)
 $phone=Plain $o.customer_phone
 foreach($x in (Wrap $(if($phone){"Telefone: "+$phone}else{"Telefone: nao informado"}))){$lines.Add($x)}
 if($o.fulfillment_type -eq "delivery"){
  $lines.Add($b+"ENDERECO DE ENTREGA"+$n)
  $street=Plain $o.street;$num=Plain $o.street_number
  $address=if($street){$street+", "+$(if($num){$num}else{"S/N"})}else{"Endereco nao informado"}
  foreach($x in (Wrap $address)){$lines.Add($x)}
  foreach($pair in @(@("Bairro: ",$o.neighborhood),@("Complemento: ",$o.complement),@("Referencia: ",$o.reference))){
   if($pair[1]){foreach($x in (Wrap ($pair[0]+[string]$pair[1]))){$lines.Add($x)}}
  }
 }
 if($o.notes){$lines.Add($b+"OBSERVACOES"+$n);foreach($x in (Wrap $o.notes)){$lines.Add($x)}}
 $lines.Add($d);$lines.Add($b+"TOTAL: R$ "+(Cash $o.total)+$n)
 if($o.payment_method -eq "cash" -and $o.cash_change_for){foreach($x in (Wrap ("TROCO PARA: R$ "+(Cash $o.cash_change_for)))){$lines.Add($x)}}
 $lines.Add("");$lines.Add("");$lines.Add($e+"d"+[char]4)
 return ($lines -join [Environment]::NewLine)
}

function RunWorker {
 if(!(Test-Path $deviceFile)){throw "É necessário executar Instalar.cmd primeiro."}
 $worker=([IO.File]::ReadAllText($deviceFile)).Trim()
 if($worker -notmatch '^lod-win-[a-f0-9]{32}$'){throw "Identificador do agente inválido."}
 $mutex=New-Object Threading.Mutex($false,"Local\LucianeKitchenAgent")
 if(!$mutex.WaitOne(0)){throw "Outro agente já está em execução."}
 try{
  Log "Agente iniciado. Impressora Windows configurada; Chrome/QZ não são necessários."
  while($true){
   try{
    $auth=ValidAuth
    [KitchenSpool]::Check($printer)
    Status "ready" "Aguardando pedidos no Supabase."
    $claim=Request "/rest/v1/rpc/claim_print_job" @{p_worker_id=$worker} $auth.access_token
    if($null -ne $claim -and $null -ne $claim.job){
     $id=[string]$claim.job.id;$token=[string]$claim.job.claim_token;$number=[string]$claim.order.order_number
     $sent=$false
     try{
      [KitchenSpool]::Check($printer)
      $bytes=[Text.Encoding]::GetEncoding(28591).GetBytes((Receipt $claim))
      [KitchenSpool]::Send($printer,$bytes,("Luciane Pedido "+$number))
      $sent=$true
      Request "/rest/v1/rpc/complete_print_job" @{p_job_id=$id;p_claim_token=$token} $auth.access_token | Out-Null
      Status "ready" ("Pedido #"+$number+" enviado à fila do Windows. Papel não verificado.")
      Log ("Pedido #"+$number+" aceito pelo spooler e concluído na fila.")
     }catch{
      if($sent){
       # Se spooler aceitou e confirmação falhou, jamais reimprimir automaticamente.
       Status "attention" "Comanda enviada, confirmação remota incerta. Conferir papel."
       Log ("Pedido #"+$number+" com confirmação remota incerta: NÃO reimprimir automaticamente.")
      }else{
       $message="Falha no envio local à impressora Windows. Conferir papel/driver."
       try{Request "/rest/v1/rpc/fail_print_job" @{p_job_id=$id;p_claim_token=$token;p_error=$message} $auth.access_token | Out-Null}catch{}
       Status "attention" $message
       Log ("Pedido #"+$number+" com falha local. Não há reenvio automático.")
      }
     }
    }
   }catch{
    Status "offline" "Impressora, rede ou sessão indisponível. Verifique o status."
    Log "Sem acesso à impressora, rede ou sessão. Nenhum pedido alterado."
   }
   Start-Sleep -Seconds 5
  }
 }finally{try{$mutex.ReleaseMutex()}catch{};$mutex.Dispose()}
}
switch($Mode){
 "setup"{Login}
 "run"{RunWorker}
 "status"{if(Test-Path $statusFile){Get-Content $statusFile -Raw}else{Write-Host "Agente ainda não iniciado."}}
 "selftest"{
  $test=[pscustomobject]@{
   job=[pscustomobject]@{kind="initial"}
   order=[pscustomobject]@{order_number=123;created_at="2026-10-18T15:00:00Z";payment_status="pending";payment_method="manual_pix";fulfillment_type="delivery";customer_name="Teste";customer_phone=$null;street="Rua A";street_number="42";neighborhood="Centro";complement="";reference="";notes="";total="66.00";cash_change_for=$null}
   items=@([pscustomobject]@{quantity=1;name="Pipoca Gourmet";size_label="1 litro";option_names=@("Ninho","Nutella")})
  }
  $out=Receipt $test
  if($out -notmatch 'PEDIDO #123' -or $out -notmatch 'PEDIDO CONFIRMADO' -or $out -notmatch 'Telefone: nao informado' -or $out -notmatch 'TOTAL: R\$ 66,00'){throw "Comanda inválida."}
  Write-Host "Autoteste passou. Nenhuma comanda ou pedido real foi acessado."
 }
}
