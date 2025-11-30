# PowerShell script to copy Files and Storage modules to a new project
# Usage: .\copy-modules.ps1 -TargetPath "C:\path\to\new\project"

param(
    [Parameter(Mandatory=$true)]
    [string]$TargetPath
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting module copy process..." -ForegroundColor Green

# Validate source paths
$sourceRoot = $PSScriptRoot
$storageModule = Join-Path $sourceRoot "src\modules\storage"
$filesModule = Join-Path $sourceRoot "src\modules\files"
$baseEntity = Join-Path $sourceRoot "src\common\entities\base.entity.ts"
$storageConfig = Join-Path $sourceRoot "src\config\configs\storage.config.ts"

if (-not (Test-Path $storageModule)) {
    throw "Storage module not found at: $storageModule"
}
if (-not (Test-Path $filesModule)) {
    throw "Files module not found at: $filesModule"
}

# Validate target path
if (-not (Test-Path $TargetPath)) {
    Write-Host "⚠️  Target path does not exist. Creating directory structure..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $TargetPath -Force | Out-Null
}

$targetSrc = Join-Path $TargetPath "src"
if (-not (Test-Path $targetSrc)) {
    New-Item -ItemType Directory -Path $targetSrc -Force | Out-Null
}

# Copy Storage Module
Write-Host "📦 Copying Storage Module..." -ForegroundColor Cyan
$targetStorage = Join-Path $targetSrc "modules\storage"
Copy-Item -Path $storageModule -Destination $targetStorage -Recurse -Force
Write-Host "   ✓ Storage module copied" -ForegroundColor Green

# Copy Files Module
Write-Host "📦 Copying Files Module..." -ForegroundColor Cyan
$targetFiles = Join-Path $targetSrc "modules\files"
Copy-Item -Path $filesModule -Destination $targetFiles -Recurse -Force
Write-Host "   ✓ Files module copied" -ForegroundColor Green

# Copy Base Entity
Write-Host "📦 Copying Base Entity..." -ForegroundColor Cyan
$targetCommon = Join-Path $targetSrc "common\entities"
if (-not (Test-Path $targetCommon)) {
    New-Item -ItemType Directory -Path $targetCommon -Force | Out-Null
}
Copy-Item -Path $baseEntity -Destination $targetCommon -Force
Write-Host "   ✓ Base entity copied" -ForegroundColor Green

# Copy Storage Config
Write-Host "📦 Copying Storage Config..." -ForegroundColor Cyan
$targetConfig = Join-Path $targetSrc "config\configs"
if (-not (Test-Path $targetConfig)) {
    New-Item -ItemType Directory -Path $targetConfig -Force | Out-Null
}
Copy-Item -Path $storageConfig -Destination $targetConfig -Force
Write-Host "   ✓ Storage config copied" -ForegroundColor Green

Write-Host "`n✅ Copy completed successfully!" -ForegroundColor Green
Write-Host "`n📋 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Install dependencies: npm install date-fns nanoid sanitize-filename" -ForegroundColor White
Write-Host "   2. Register StorageModule and FilesModule in app.module.ts" -ForegroundColor White
Write-Host "   3. Register storage.config.ts in ConfigModule" -ForegroundColor White
Write-Host "   4. Update path aliases in tsconfig.json if needed" -ForegroundColor White
Write-Host "   5. Create database migrations for File and TempFile entities" -ForegroundColor White
Write-Host "   6. Create storage directories: mkdir -p storage/temp storage/files" -ForegroundColor White
Write-Host "   7. Add STORAGE_BASE_DIR=storage to .env file" -ForegroundColor White
Write-Host "`n📖 See MIGRATION_GUIDE.md for detailed instructions" -ForegroundColor Cyan

