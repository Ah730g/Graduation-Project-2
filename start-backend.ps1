# سكريبت تشغيل Backend
Write-Host "=== Starting Laravel Backend ===" -ForegroundColor Cyan
Write-Host ""

# الانتقال إلى مجلد backend
Set-Location $PSScriptRoot\backend

# التحقق من MySQL
Write-Host "Checking MySQL connection..." -ForegroundColor Yellow
$mysqlCheck = & "$PSScriptRoot\backend\check_mysql.ps1" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "⚠️  WARNING: MySQL is not running!" -ForegroundColor Yellow
    Write-Host "Please start MySQL in XAMPP Control Panel first." -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Do you want to continue anyway? (y/n)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 1
    }
}

# مسح الـ cache
Write-Host "Clearing cache..." -ForegroundColor Yellow
php artisan config:clear
php artisan cache:clear
php artisan route:clear
Write-Host ""

# تشغيل Laravel
Write-Host "Starting Laravel server on http://localhost:8000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""
php artisan serve

