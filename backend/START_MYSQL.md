# ⚠️ URGENT: Start MySQL in XAMPP

## The Problem
You're getting a **500 Internal Server Error** because **MySQL is not running**.

## Quick Fix (3 Steps)

### Step 1: Open XAMPP Control Panel
- Press `Win + R`
- Type: `C:\xampp\xampp-control.exe` (or wherever XAMPP is installed)
- Press Enter

### Step 2: Start MySQL
- In XAMPP Control Panel, find **MySQL**
- Click the **Start** button
- Wait until it shows **"Running"** in **green**

### Step 3: Test Your Signup Again
- Go back to your application
- Try signing up again
- It should work now! ✅

---

## If MySQL Won't Start

### Check Port 3306
If MySQL won't start, another service might be using port 3306:

1. Open **Command Prompt as Administrator**
2. Run: `netstat -ano | findstr :3306`
3. If you see results, note the PID (last number)
4. Open **Task Manager** → **Details** tab
5. Find the process with that PID
6. End that process
7. Try starting MySQL in XAMPP again

### Check XAMPP Logs
1. In XAMPP Control Panel, click **Logs** next to MySQL
2. Look for error messages
3. Common issues:
   - Port already in use
   - MySQL service already running (Windows Services)

### Alternative: Stop Windows MySQL Service
1. Press `Win + R`
2. Type: `services.msc`
3. Press Enter
4. Find **MySQL** or **MySQL80** service
5. Right-click → **Stop**
6. Try starting MySQL in XAMPP again

---

## Verify MySQL is Running

After starting MySQL, run this in your `backend` directory:

```powershell
.\check_mysql.ps1
```

Or test manually:
```powershell
mysql -u root -h 127.0.0.1
```

If you see a MySQL prompt, it's working! Type `exit` to leave.

---

## Still Not Working?

1. **Check your `.env` file** in `backend/.env`:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=laravel
   DB_USERNAME=root
   DB_PASSWORD=
   ```

2. **Create the database** if it doesn't exist:
   - Open http://localhost/phpMyAdmin
   - Click "New" → Enter "laravel" → Click "Create"

3. **Run migrations**:
   ```bash
   php artisan migrate
   ```

4. **Clear cache**:
   ```bash
   php artisan config:clear
   php artisan cache:clear
   ```

---

## Summary
✅ **MySQL must be running in XAMPP for your app to work!**
✅ Start MySQL → Test signup → Should work!
