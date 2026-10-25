param([Parameter(Mandatory=$true)][string]$WebViewPackage,[Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference='Stop'
$projectRoot=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$packageRoot=(Resolve-Path $WebViewPackage).Path
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$targetRoot=(Resolve-Path $OutputDirectory).Path
$uiRoot=Join-Path $targetRoot 'ui'
foreach($relative in @('yonetim','assets','vendor')){New-Item -ItemType Directory -Force -Path (Join-Path $uiRoot $relative) | Out-Null}
foreach($relative in @('yonetim/index.html','assets/kent-logo.png','assets/kent-campus.svg','vendor/qrcode.js','config.js','records.js','qr-ui.js','admin.js','portal-ui.js','theme.css','admin-theme.css')){Copy-Item -LiteralPath (Join-Path $projectRoot $relative) -Destination (Join-Path $uiRoot $relative) -Force}
$core=Join-Path $packageRoot 'lib/net462/Microsoft.Web.WebView2.Core.dll'
$forms=Join-Path $packageRoot 'lib/net462/Microsoft.Web.WebView2.WinForms.dll'
$loader=Join-Path $packageRoot 'runtimes/win-x64/native/WebView2Loader.dll'
Copy-Item -LiteralPath $core,$forms,$loader -Destination $targetRoot -Force
$compiler=Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
$taskCompilerArgs=@('/nologo','/target:winexe','/platform:x64','/optimize+',('/out:'+(Join-Path $targetRoot 'KentOnam-Yonetim.exe')),'/reference:System.Windows.Forms.dll','/reference:System.Drawing.dll',('/reference:'+$core),('/reference:'+$forms),(Join-Path $PSScriptRoot 'KentOnam.cs'))
& $compiler @taskCompilerArgs
if($LASTEXITCODE -ne 0){throw 'EXE compilation failed'}
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'KULLANIM.md') -Destination $targetRoot -Force
Write-Output (Join-Path $targetRoot 'KentOnam-Yonetim.exe')
