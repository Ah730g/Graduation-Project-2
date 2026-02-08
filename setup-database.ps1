# سكريبت إعداد قاعدة البيانات
Write-Host "=== Database Setup ===" -ForegroundColor Cyan
Write-Host ""

# الانتقال إلى مجلد backend
Set-Location $PSScriptRoot\backend

# التحقق من MySQL
Write-Host "Checking MySQL connection..." -ForegroundColor Yellow
$mysqlCheck = & "$PSScriptRoot\backend\check_mysql.ps1" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ ERROR: MySQL is not running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "1. Open XAMPP Control Panel" -ForegroundColor White
    Write-Host "2. Click 'Start' next to MySQL" -ForegroundColor White
    Write-Host "3. Wait until it shows 'Running' in green" -ForegroundColor White
    Write-Host "4. Run this script again" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ MySQL is running!" -ForegroundColor Green
Write-Host ""

# التحقق من ملف .env
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "✅ .env file created" -ForegroundColor Green
        Write-Host ""
        Write-Host "⚠️  Please configure database settings in .env file:" -ForegroundColor Yellow
        Write-Host "   DB_DATABASE=laravel" -ForegroundColor White
        Write-Host "   DB_USERNAME=root" -ForegroundColor White
        Write-Host "   DB_PASSWORD=" -ForegroundColor White
        Write-Host ""
        $continue = Read-Host "Press Enter after configuring .env file"
    } else {
        Write-Host "❌ .env.example not found!" -ForegroundColor Red
        exit 1
    }
}

# توليد Application Key إذا لم يكن موجوداً
Write-Host "Checking application key..." -ForegroundColor Yellow
$envContent = Get-Content ".env" -Raw
if ($envContent -notmatch "APP_KEY=base64:") {
    Write-Host "Generating application key..." -ForegroundColor Yellow
    php artisan key:generate
    Write-Host "✅ Application key generated" -ForegroundColor Green
    Write-Host ""
}

# مسح الـ cache
Write-Host "Clearing cache..." -ForegroundColor Yellow
php artisan config:clear
php artisan cache:clear
Write-Host ""

# تشغيل migrations
Write-Host "Running database migrations..." -ForegroundColor Yellow
php artisan migrate
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Migrations failed!" -ForegroundColor Red
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "1. Database exists in MySQL" -ForegroundColor White
    Write-Host "2. Database credentials in .env are correct" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ Migrations completed successfully!" -ForegroundColor Green
Write-Host ""

# سؤال عن Seeders
$seed = Read-Host "Do you want to seed the database with test data? (y/n)"
if ($seed -eq "y" -or $seed -eq "Y") {
    Write-Host "Seeding database..." -ForegroundColor Yellow
    php artisan db:seed
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database seeded successfully!" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=== Database Setup Complete ===" -ForegroundColor Cyan
Write-Host "You can now start the backend server!" -ForegroundColor Green

