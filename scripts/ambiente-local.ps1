param(
  [Parameter(Mandatory, Position = 0)]
  [ValidateSet('install', 'build', 'test', 'start', 'stop', 'qa', 'baseline', 'compare', 'review', 'review-before', 'review-performance', 'lighthouse', 'performance-before', 'performance')]
  [string]$Action
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$image = 'mcr.microsoft.com/playwright:v1.56.1-noble@sha256:f1e7e01021efd65dd1a2c56064be399f3e4de00fd021ac561325f2bfbb2b837a'
$sha256 = [Security.Cryptography.SHA256]::Create()
try {
  $pathHash = $sha256.ComputeHash([Text.Encoding]::UTF8.GetBytes($root.ToLowerInvariant()))
} finally {
  $sha256.Dispose()
}
$hashPrefix = [BitConverter]::ToString($pathHash, 0, 6).Replace('-', '').ToLowerInvariant()
$instance = "lod-qa-$hashPrefix"
$repositoryMount = "type=bind,source=$root,target=/repo"
$arguments = @(
  'run', '--rm', '--init', '--shm-size=512m', '--workdir', '/repo',
  '--mount', $repositoryMount,
  '--mount', "type=volume,source=$instance-app,target=/repo/node_modules",
  '--mount', "type=volume,source=$instance-tools,target=/repo/tools/qa-commerce/node_modules",
  '--env', 'SUPABASE_URL=http://127.0.0.1:8181',
  '--env', 'SUPABASE_PUBLISHABLE_KEY=qa_mock_no_credentials',
  '--env', 'SITE_ORDERING_ENABLED=false',
  '--env', 'MP_PUBLIC_KEY_TEST=',
  '--env', 'SITES_BUILD_TIMEOUT=5m',
  '--env', 'CI=true',
  '--env', 'TZ=UTC'
)

function Invoke-QaDocker {
  & docker @args
  if ($LASTEXITCODE -ne 0) { throw "Docker saiu com código $LASTEXITCODE." }
}

switch ($Action) {
  'install' {
    Invoke-QaDocker @arguments --env 'SITES_INSTALL_TIMEOUT=12m' $image npm run install:ci
    Invoke-QaDocker @arguments $image npm ci --prefix tools/qa-commerce --no-audit --no-fund
  }
  'build' {
    Invoke-QaDocker @arguments --network none $image npm run build
  }
  'test' {
    Invoke-QaDocker @arguments --network none $image npm test
  }
  'start' {
    Invoke-QaDocker @arguments --detach --name $instance --publish '127.0.0.1:8181:8181' --env 'QA_HOST=0.0.0.0' $image node tools/qa-commerce/preview.mjs
    $elapsed = [Diagnostics.Stopwatch]::StartNew()
    while ($elapsed.Elapsed.TotalSeconds -lt 55) {
      try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8181/__qa/health' -TimeoutSec 2
        if ($response.Content -eq 'synthetic-local') {
          Write-Output 'Prévia local em http://127.0.0.1:8181/'
          return
        }
      } catch {
        # O processo no contêiner ainda pode estar carregando o build.
      }
      Start-Sleep -Milliseconds 500
    }
    & docker logs $instance
    throw 'A prévia não respondeu. Confira o build e a porta 8181.'
  }
  'stop' {
    Invoke-QaDocker stop $instance
  }
  default {
    Invoke-QaDocker @arguments --network none $image node tools/qa-commerce/run.mjs $Action
  }
}
