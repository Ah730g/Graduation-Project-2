# Fix MySQL Connection Error for XAMPP

## Problem
You're getting this error:
```
SQLSTATE[HY000] [2002] No connection could be made because the target machine actively refused it
```

## Solution Steps

### Step 1: Start MySQL in XAMPP
1. Open **XAMPP Control Panel**
2. Find **MySQL** in the list
3. Click the **Start** button next to MySQL
4. Wait until it shows **Running** in green
5. If it shows errors, check the **Logs** button

### Step 2: Verify Your .env File
Open `backend/.env` and make sure you have these settings:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=your_database_name
DB_USERNAME=root
DB_PASSWORD=
```

**Important Notes:**
- `DB_HOST` should be `127.0.0.1` or `localhost`
- `DB_PORT` should be `3306` (default MySQL port)
- `DB_USERNAME` should be `root` (XAMPP default)
- `DB_PASSWORD` should be **empty** (XAMPP default has no password)
- Replace `your_database_name` with your actual database name

### Step 3: Create the Database
1. Open **phpMyAdmin** (http://localhost/phpMyAdmin)
2. Click **New** in the left sidebar
3. Enter your database name (same as `DB_DATABASE` in `.env`)
4. Choose **utf8mb4_unicode_ci** as collation
5. Click **Create**

**OR** use command line:
```bash
mysql -u root -h 127.0.0.1
CREATE DATABASE your_database_name;
exit;
```

### Step 4: Clear Laravel Cache
Run these commands in your `backend` directory:

```bash
php artisan config:clear
php artisan cache:clear
```

### Step 5: Test the Connection
Run the diagnostic script:
```bash
.\check_mysql.ps1
```

### Step 6: Run Migrations
Once MySQL is working, run:
```bash
php artisan migrate
```

## Common Issues

### Issue: MySQL won't start in XAMPP
**Solution:**
- Check if port 3306 is already in use by another service
- Stop other MySQL services (Windows Services)
- Or change XAMPP MySQL port in `xampp/mysql/bin/my.ini`

### Issue: "Access denied" error
**Solution:**
- Make sure `DB_PASSWORD` is empty in `.env`
- XAMPP MySQL default user is `root` with no password

### Issue: Port 3306 is in use but connection fails
**Solution:**
- Another service might be using the port
- Check Windows Services for other MySQL instances
- Restart XAMPP MySQL service

## Quick Checklist
- [ ] MySQL is running in XAMPP Control Panel (green "Running")
- [ ] `.env` file has correct `DB_HOST=127.0.0.1`
- [ ] `.env` file has correct `DB_PORT=3306`
- [ ] `.env` file has `DB_USERNAME=root` and `DB_PASSWORD=` (empty)
- [ ] Database exists in phpMyAdmin
- [ ] Ran `php artisan config:clear`
- [ ] Tested connection with `.\check_mysql.ps1`

## Still Having Issues?
1. Check XAMPP MySQL logs (click "Logs" in XAMPP Control Panel)
2. Verify MySQL is actually running: Open Services (Win+R → `services.msc`) and look for MySQL
3. Try connecting manually: `mysql -u root -h 127.0.0.1`
4. Check if firewall is blocking the connection
