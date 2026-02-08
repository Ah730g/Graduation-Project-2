# سكريبت تشغيل Frontend
Write-Host "=== Starting React Frontend ===" -ForegroundColor Cyan
Write-Host ""

# الانتقال إلى مجلد frontend
Set-Location $PSScriptRoot\frontend

# التحقق من تثبيت dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

# تشغيل Vite dev server
Write-Host "Starting Vite dev server on http://localhost:5173" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""
npm run dev

