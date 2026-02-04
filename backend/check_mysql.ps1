# MySQL Connection Checker for XAMPP
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MySQL Connection Checker for XAMPP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if MySQL port is in use
Write-Host "Checking if MySQL is running on port 3306..." -ForegroundColor Yellow
$portCheck = netstat -ano | findstr :3306
if ($portCheck) {
    Write-Host "[OK] MySQL appears to be running (port 3306 is in use)" -ForegroundColor Green
} else {
    Write-Host "[ERROR] MySQL is NOT running (port 3306 is not in use)" -ForegroundColor Red
    Write-Host ""
    Write-Host "SOLUTION:" -ForegroundColor Yellow
    Write-Host "1. Open XAMPP Control Panel" -ForegroundColor White
    Write-Host "2. Click 'Start' next to MySQL" -ForegroundColor White
    Write-Host "3. Wait until it shows 'Running' in green" -ForegroundColor White
    Write-Host "4. Run this script again to verify" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "Testing MySQL connection..." -ForegroundColor Yellow

# Try to connect to MySQL
try {
    $env:Path += ";C:\xampp\mysql\bin"
    $result = & mysql -u root -h 127.0.0.1 -e "SELECT 1;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] MySQL connection successful!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Checking if database exists..." -ForegroundColor Yellow
        
        # Check .env file for database name
        if (Test-Path .env) {
            $dbName = (Get-Content .env | Select-String "DB_DATABASE=").ToString().Split("=")[1].Trim()
            Write-Host "Database name from .env: $dbName" -ForegroundColor Cyan
            
            $dbCheck = & mysql -u root -h 127.0.0.1 -e "SHOW DATABASES LIKE '$dbName';" 2>&1
            if ($dbCheck -match $dbName) {
                Write-Host "[OK] Database '$dbName' exists" -ForegroundColor Green
            } else {
                Write-Host "[ERROR] Database '$dbName' does NOT exist" -ForegroundColor Red
                Write-Host ""
                Write-Host "Creating database..." -ForegroundColor Yellow
                & mysql -u root -h 127.0.0.1 -e "CREATE DATABASE IF NOT EXISTS $dbName;" 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "[OK] Database '$dbName' created successfully!" -ForegroundColor Green
                } else {
                    Write-Host "[ERROR] Failed to create database" -ForegroundColor Red
                }
            }
        }
    } else {
        Write-Host "[ERROR] MySQL connection failed" -ForegroundColor Red
        Write-Host "Error: $result" -ForegroundColor Red
    }
} catch {
    Write-Host "[ERROR] Could not test MySQL connection" -ForegroundColor Red
    Write-Host "Make sure MySQL is in your PATH or XAMPP is installed at C:\xampp" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Make sure MySQL is running in XAMPP" -ForegroundColor White
Write-Host "2. Verify your .env file has correct settings:" -ForegroundColor White
Write-Host "   DB_CONNECTION=mysql" -ForegroundColor Gray
Write-Host "   DB_HOST=127.0.0.1" -ForegroundColor Gray
Write-Host "   DB_PORT=3306" -ForegroundColor Gray
Write-Host "   DB_DATABASE=your_database_name" -ForegroundColor Gray
Write-Host "   DB_USERNAME=root" -ForegroundColor Gray
Write-Host "   DB_PASSWORD=" -ForegroundColor Gray
Write-Host "3. Run: php artisan config:clear" -ForegroundColor White
Write-Host "4. Try your signup again" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
