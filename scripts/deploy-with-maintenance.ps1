<#
.SYNOPSIS
  Local / VPS deploy helper: show maintenance page, swap in new build, clear maintenance.

.DESCRIPTION
  For Docker/Nginx hosts.
  Does NOT run ng build unless -Build is passed.

.PARAMETER DistPath
  Path to production static files (default: dist/client)

.PARAMETER MaintenancePath
  Path to maintenance/index.html (default: maintenance/index.html)

.PARAMETER TargetPath
  Live web root to update (required for file copy deploys)

.PARAMETER Build
  If set, runs production ng build before copy

.PARAMETER SkipMaintenance
  Deploy app only (no maintenance window)
#>
[CmdletBinding()]
param(
  [string]$DistPath = "dist/client",
  [string]$MaintenancePath = "maintenance/index.html",
  [string]$TargetPath = "",
  [switch]$Build,
  [switch]$SkipMaintenance
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Write-Step([string]$msg) {
  Write-Host ""
  Write-Host "==> $msg" -ForegroundColor Cyan
}

if (-not (Test-Path $MaintenancePath)) {
  throw "Maintenance page not found: $MaintenancePath"
}

if ($Build) {
  Write-Step "Production build (ng build --configuration production)"
  npx ng build --configuration production
  if ($LASTEXITCODE -ne 0) { throw "ng build failed" }
}

if (-not (Test-Path $DistPath)) {
  throw "Dist not found: $DistPath — build first or pass -Build"
}

if (-not $TargetPath) {
  Write-Step "Dry run (no -TargetPath)"
  Write-Host "Would enable maintenance from: $MaintenancePath"
  Write-Host "Would publish bundle from:    $DistPath"
  Write-Host "Pass -TargetPath 'C:\inetpub\banking-system' (or Linux web root) to apply."
  exit 0
}

if (-not (Test-Path $TargetPath)) {
  New-Item -ItemType Directory -Path $TargetPath -Force | Out-Null
}

$backupIndex = Join-Path $TargetPath "index.html.app-backup"

try {
  if (-not $SkipMaintenance) {
    Write-Step "Enable maintenance page"
    if (Test-Path (Join-Path $TargetPath "index.html")) {
      Copy-Item (Join-Path $TargetPath "index.html") $backupIndex -Force
    }
    Copy-Item $MaintenancePath (Join-Path $TargetPath "index.html") -Force
    Copy-Item $MaintenancePath (Join-Path $TargetPath "404.html") -Force -ErrorAction SilentlyContinue
    New-Item -ItemType File -Path (Join-Path $TargetPath ".maintenance") -Force | Out-Null
    Write-Host "Maintenance live at $TargetPath"
    Start-Sleep -Seconds 2
  }

  Write-Step "Publish application files"
  $maintHold = Join-Path $env:TEMP ("banking-maint-" + [guid]::NewGuid().ToString("n") + ".html")
  Copy-Item $MaintenancePath $maintHold -Force

  Get-ChildItem $DistPath -Force | ForEach-Object {
    $dest = Join-Path $TargetPath $_.Name
    if ($_.PSIsContainer) {
      Copy-Item $_.FullName $dest -Recurse -Force
    } else {
      Copy-Item $_.FullName $dest -Force
    }
  }

  if (-not $SkipMaintenance) {
    Copy-Item $maintHold (Join-Path $TargetPath "index.html") -Force
  }

  Write-Step "Clear maintenance — go live"
  Copy-Item (Join-Path $DistPath "index.html") (Join-Path $TargetPath "index.html") -Force
  if (Test-Path (Join-Path $DistPath "404.html")) {
    Copy-Item (Join-Path $DistPath "404.html") (Join-Path $TargetPath "404.html") -Force
  } else {
    Copy-Item (Join-Path $DistPath "index.html") (Join-Path $TargetPath "404.html") -Force
  }
  Remove-Item (Join-Path $TargetPath ".maintenance") -Force -ErrorAction SilentlyContinue
  Remove-Item $backupIndex -Force -ErrorAction SilentlyContinue
  Remove-Item $maintHold -Force -ErrorAction SilentlyContinue

  Write-Host ""
  Write-Host "Deploy complete." -ForegroundColor Green
}
catch {
  Write-Host "Deploy failed: $_" -ForegroundColor Red
  if ((-not $SkipMaintenance) -and (Test-Path $MaintenancePath)) {
    Write-Host "Leaving/restoring maintenance page for safety..."
    Copy-Item $MaintenancePath (Join-Path $TargetPath "index.html") -Force -ErrorAction SilentlyContinue
  }
  throw
}
