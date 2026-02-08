# دليل إعداد وتشغيل المشروع

## ✅ ما تم إعداده

- ✅ تثبيت Backend dependencies (Composer)
- ✅ إنشاء ملف `.env` للـ Backend
- ✅ توليد Application Key
- ✅ تثبيت Frontend dependencies (npm)
- ✅ ملفات `.env` جاهزة

## 📋 المتطلبات

- PHP 8.2+ ✅ (مثبت)
- Composer ✅ (مثبت)
- Node.js & npm ✅ (مثبت)
- MySQL (يجب تشغيله)

## 🚀 خطوات التشغيل السريعة

### الطريقة السريعة (موصى بها) 🎯

**1. إعداد قاعدة البيانات:**

```powershell
.\setup-database.ps1
```

هذا السكريبت سيقوم بـ:

- التحقق من MySQL
- إنشاء ملف .env إذا لم يكن موجوداً
- تشغيل migrations
- إضافة بيانات تجريبية (اختياري)

**2. تشغيل المشروع:**

```powershell
.\start-all.ps1
```

هذا سيشغل Backend و Frontend في نوافذ منفصلة تلقائياً!

---

### الطريقة اليدوية

#### 1. تشغيل MySQL

**إذا كنت تستخدم XAMPP:**

1. افتح XAMPP Control Panel
2. اضغط على "Start" بجانب MySQL
3. انتظر حتى يظهر "Running" باللون الأخضر

**للتحقق من أن MySQL يعمل:**

```powershell
cd backend
.\check_mysql.ps1
```

#### 2. إعداد قاعدة البيانات

**استخدم السكريبت المخصص:**

```powershell
.\setup-database.ps1
```

**أو يدوياً:**

- افتح phpMyAdmin (http://localhost/phpmyadmin) وأنشئ قاعدة بيانات باسم `laravel`
- عدّل ملف `backend/.env`:

```env
DB_DATABASE=laravel
DB_USERNAME=root
DB_PASSWORD=
```

- ثم شغّل:

```powershell
cd backend
php artisan migrate
php artisan db:seed  # لإضافة بيانات تجريبية
```

#### 3. تشغيل Backend و Frontend

**الطريقة السريعة:**

```powershell
.\start-backend.ps1   # في نافذة واحدة
.\start-frontend.ps1  # في نافذة أخرى
```

**أو يدوياً:**

```powershell
# Terminal 1 - Backend
cd backend
php artisan serve

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**أو استخدم السكريبت الشامل:**

```powershell
.\start-all.ps1  # يشغل كل شيء تلقائياً!
```

- Backend: http://localhost:8000
- Frontend: http://localhost:5173

## 🔧 إعدادات إضافية

### إعدادات OpenRouter (لـ Floor Plan Generation)

إذا كنت تريد استخدام ميزة توليد مخططات الأرضية، أضف في `backend/.env`:

```env
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_ENDPOINT=https://openrouter.ai/api/v1/chat/completions
OPENROUTER_MODEL=meta-llama/llama-3.1-70b-instruct:free
```

### إعدادات ImageKit

إعدادات ImageKit موجودة في `frontend/.env`:

```env
VITE_IMAGEKIT_PUBLIC_KEY=public_eKYxvjaKqADO7WsdHCf4/eIkJUg=
VITE_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/scemxecjq
```

## 🐛 حل المشاكل

راجع ملف `TROUBLESHOOTING.md` للحلول الشائعة.

### مشاكل شائعة:

1. **خطأ 500 في API:**

   - تأكد من أن MySQL يعمل
   - تأكد من تشغيل migrations
   - امسح الـ cache: `php artisan config:clear && php artisan cache:clear`

2. **خطأ في الاتصال بقاعدة البيانات:**

   - تحقق من إعدادات `DB_*` في `backend/.env`
   - تأكد من أن قاعدة البيانات موجودة

3. **Frontend لا يتصل بالـ Backend:**
   - تأكد من أن Backend يعمل على http://localhost:8000
   - تحقق من `VITE_BASE_API_URL` في `frontend/.env`

## 📝 ملاحظات

- Backend يعمل على المنفذ 8000
- Frontend يعمل على المنفذ 5173
- تأكد من تشغيل MySQL قبل تشغيل Backend
