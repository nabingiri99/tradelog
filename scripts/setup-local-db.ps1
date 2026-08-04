<#
.SYNOPSIS
  setup-local-db.ps1 - Install and start a LOCAL MongoDB for TradeLog on Windows.
  No cloud database required.

.DESCRIPTION
  - Detects an existing mongod; installs MongoDB Community if missing.
  - Starts MongoDB as a background process bound to 127.0.0.1:27017.
  - Windows PowerShell 5.1+ or PowerShell 7.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\setup-local-db.ps1
#>

$ErrorActionPreference = "Stop"
$MongoHost = "127.0.0.1"
$MongoPort = 27017
$DbPath = Join-Path $env:LOCALAPPDATA "TradeLog\MongoDB\data"
$LogPath = Join-Path $env:LOCALAPPDATA "TradeLog\MongoDB\mongod.log"

function Write-Step([string]$Msg) { Write-Host "[setup-local-db] $Msg" -ForegroundColor Cyan }
function Write-Err([string]$Msg)  { Write-Host "[setup-local-db] ERROR: $Msg" -ForegroundColor Red; exit 1 }

function Test-Port {
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $async = $client.BeginConnect($MongoHost, $MongoPort, $null, $null)
    if ($async.AsyncWaitHandle.WaitOne(1000)) {
      $client.EndConnect($async)
      $client.Close()
      return $true
    }
    $client.Close()
    return $false
  } catch {
    return $false
  }
}

function Install-Mongod {
  Write-Step "MongoDB not found. Downloading MongoDB Community Server..."
  $url = "https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-8.0.5.zip"
  $zip = Join-Path $env:TEMP "mongodb.zip"
  Invoke-WebRequest -Uri $url -OutFile $zip
  $extract = Join-Path $env:LOCALAPPDATA "TradeLog\MongoDB\bin"
  Expand-Archive -Path $zip -DestinationPath $extract -Force
  $env:PATH += ";$(Join-Path $extract (Get-ChildItem $extract -Directory | Select-Object -First 1 -ExpandProperty FullName))"
  [Environment]::SetEnvironmentVariable("PATH", $env:PATH, "User")
  Write-Step "MongoDB downloaded and extracted. You may need a new terminal for PATH to refresh."
}

if (-not (Get-Command mongod -ErrorAction SilentlyContinue)) {
  Install-Mongod
}
if (-not (Get-Command mongod -ErrorAction SilentlyContinue)) {
  Write-Err "mongod is still not on PATH. Open a new terminal and re-run this script, or install MongoDB Community manually from https://www.mongodb.com/try/download/community"
}

if (Test-Port) {
  Write-Step "MongoDB is already running at $MongoHost`:$MongoPort"
} else {
  New-Item -ItemType Directory -Force -Path $DbPath | Out-Null
  New-Item -ItemType Directory -Force -Path (Split-Path $LogPath) | Out-Null
  Write-Step "Starting MongoDB (data: $DbPath) ..."
  Start-Process mongod -ArgumentList "--dbpath", "`"$DbPath`"", "--bind_ip", $MongoHost, "--port", "$MongoPort", "--logpath", "`"$LogPath`"", "--logappend" -WindowStyle Hidden
  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Port) { $ready = $true; break }
  }
  if (-not $ready) { Write-Err "MongoDB did not become reachable on port $MongoPort. Check $LogPath" }
  Write-Step "MongoDB ready at mongodb://$MongoHost`:$MongoPort/tradelog"
}

Write-Step "Done. Now run:  npm install  inside backend/ and frontend/, then  npm run dev  in each (or use your IDE)."
