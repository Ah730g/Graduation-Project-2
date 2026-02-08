# سكريبت تشغيل المشروع كاملاً
Write-Host "=== Starting Full Stack Application ===" -ForegroundColor Cyan
Write-Host ""

# التحقق من MySQL
Write-Host "Checking MySQL..." -ForegroundColor Yellow
$mysqlCheck = & "$PSScriptRoot\backend\check_mysql.ps1" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "⚠️  WARNING: MySQL is not running!" -ForegroundColor Yellow
    Write-Host "The backend may not work properly without MySQL." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host ""
Write-Host "Starting Backend and Frontend..." -ForegroundColor Green
Write-Host "Backend: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all servers" -ForegroundColor Yellow
Write-Host ""

# تشغيل Backend في نافذة جديدة
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; php artisan serve" -WindowStyle Normal

# انتظار قليل
Start-Sleep -Seconds 2

# تشغيل Frontend في نافذة جديدة
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev" -WindowStyle Normal

Write-Host "✅ Both servers started in separate windows!" -ForegroundColor Green
Write-Host ""
Write-Host "To stop the servers, close the PowerShell windows or press Ctrl+C in each window." -ForegroundColor Yellow

