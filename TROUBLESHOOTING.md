# دليل حل المشاكل (Troubleshooting Guide)

## الأخطاء الشائعة وحلولها

### 1. خطأ 500 في `/api/notifications/unread-count`

**السبب المحتمل:**
- جدول `notifications` غير موجود في قاعدة البيانات
- Migration لم يتم تشغيلها

**الحل:**
```bash
cd backend
php artisan migrate
```

إذا استمرت المشكلة، تحقق من وجود جدول `notifications`:
```bash
php artisan tinker
>>> Schema::hasTable('notifications')
```

### 2. خطأ 500 في `/api/property`

**السبب المحتمل:**
- جدول `porperties` غير موجود أو فارغ
- Migration لم يتم تشغيلها

**الحل:**
```bash
cd backend
php artisan migrate
php artisan db:seed --class=DatabaseSeeder
```

### 3. خطأ 500/504 في `/api/floor-plan/generate`

**الأسباب المحتملة:**
1. **API Key غير موجود أو غير صحيح:**
   - تحقق من ملف `.env` في مجلد `backend`
   - تأكد من وجود:
     ```
     OPENROUTER_API_KEY=your_api_key_here
     OPENROUTER_ENDPOINT=https://openrouter.ai/api/v1/chat/completions
     OPENROUTER_MODEL=meta-llama/llama-3.1-70b-instruct:free
     ```

2. **Timeout:**
   - الطلب يستغرق وقتاً طويلاً (قد يصل إلى 4 دقائق)
   - تم زيادة timeout في الكود إلى 240 ثانية

3. **مشكلة في الاتصال:**
   - تحقق من اتصال الإنترنت
   - تحقق من أن OpenRouter API متاح

**الحل:**
```bash
# تحقق من إعدادات .env
cd backend
cat .env | grep OPENROUTER

# إذا لم تكن موجودة، أضفها:
# OPENROUTER_API_KEY=your_key_here
# OPENROUTER_ENDPOINT=https://openrouter.ai/api/v1/chat/completions
# OPENROUTER_MODEL=meta-llama/llama-3.1-70b-instruct:free
```

### 4. خطأ في Migration لـ `floor_plan_data`

**السبب:**
- Migration الجديدة لم يتم تشغيلها

**الحل:**
```bash
cd backend
php artisan migrate
```

### 5. جميع الأخطاء 500

**الحل الشامل:**
```bash
cd backend

# 1. تشغيل جميع الـ migrations
php artisan migrate

# 2. تشغيل الـ seeders (لإضافة بيانات تجريبية)
php artisan db:seed

# 3. مسح الـ cache
php artisan config:clear
php artisan cache:clear
php artisan route:clear

# 4. إعادة تحميل الـ config
php artisan config:cache
```

### 6. التحقق من سجلات الأخطاء

```bash
cd backend
tail -f storage/logs/laravel.log
```

أو في Windows PowerShell:
```powershell
Get-Content storage\logs\laravel.log -Wait -Tail 50
```

## خطوات التحقق السريع

1. **التحقق من قاعدة البيانات:**
   ```bash
   php artisan tinker
   >>> DB::connection()->getPdo();
   >>> Schema::hasTable('notifications');
   >>> Schema::hasTable('porperties');
   >>> Schema::hasTable('posts');
   ```

2. **التحقق من الـ Routes:**
   ```bash
   php artisan route:list | grep notifications
   php artisan route:list | grep property
   php artisan route:list | grep floor-plan
   ```

3. **التحقق من الـ Environment:**
   ```bash
   php artisan config:show services.openrouter
   ```

## ملاحظات مهمة

- تأكد من أن قاعدة البيانات متصلة وصحيحة في ملف `.env`
- تأكد من أن جميع الـ migrations تم تشغيلها
- في حالة الأخطاء المتكررة، امسح الـ cache وأعد تحميل الـ config
