# تصدير عقود PDF بالعربية (RTL و Arabic Shaping)

## ما تم تطبيقه

1. **قوالب العقود (HTML + CSS)**
   - `resources/views/contracts/pdf.blade.php` و `pdf_ar.blade.php`:
   - `dir="rtl"` و `direction: rtl` و `unicode-bidi: isolate` لاتجاه من اليمين لليسار.
   - خط عربي من Google Fonts: **Cairo** و **Amiri** (تعمل عند التصدير عبر المتصفح أو wkhtmltopdf).
   - تطبيق RTL على الأقسام والعناوين والقيم والنصوص.

2. **خط DomPDF (إصلاح ???)**  
   - تم تعيين **DejaVu Sans** كخط أساسي في قوالب العقود وفي إعداد `default_font` لـ DomPDF.  
   - خط DejaVu Sans مضمّن في DomPDF ويدعم العربية؛ عند ظهور "???" كان السبب استخدام خط لا يدعم العربية (مثل Cairo من Google الذي لا يُحمّل في DomPDF).  
   - إن استمرت "???" تأكد أنك لا تستبدل `font-family` في القالب بخط غير موجود في DomPDF.

3. **معالجة التشكيل والاتجاه (DomPDF)**
   - عند استخدام **DomPDF** يتم تمرير كل النصوص العربية عبر دالة `arabic_pdf()` التي تستخدم **ar-php** (Glyphs / `utf8Glyphs`) لتحويل النص إلى:
     - **تشكيل الحروف** (وصل الحروف بشكل صحيح)
     - **ترتيب بصري** يناسب الرسم من اليسار لليمين (LTR) في DomPDF
   - عند استخدام **Snappy** لا تُطبَّق هذه المعالجة لأن المتصفح يطبّق RTL والتشكيل تلقائياً.

4. **محرك تصدير PDF**
   - **Snappy (wkhtmltopdf)**: عند تفعيله يعتمد على محرك المتصفح، فيطبق Arabic Shaping و RTL بشكل صحيح.
   - **DomPDF**: يستخدم DejaVu Sans + معالجة ar-php (utf8Glyphs) لعرض العربية بشكل مقروء ومتصل.

## تفعيل أفضل عرض للعربية (Snappy)

1. تثبيت **wkhtmltopdf** على السيرفر:
   - [تحميل wkhtmltopdf](https://wkhtmltopdf.org/downloads.html) (يفضل 0.12.x).
   - Windows: ثبّت ثم حدد المسار في `.env` (مثال: `WKHTMLTOPDF_PATH=C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe`).

2. في ملف `.env`:
   ```env
   CONTRACT_PDF_ENGINE=snappy
   WKHTMLTOPDF_PATH=wkhtmltopdf
   ```
   (على Windows استخدم المسار الكامل إن لم يكن الأمر في PATH.)

3. إذا فشل Snappy (مثلاً عدم وجود wkhtmltopdf)، يتم الرجوع تلقائياً إلى DomPDF.

## استخدام Canvas أو رسم النص يدوياً

إذا كان لديك رسم نص عربي على Canvas (واجهة المستخدم):

- استخدم **Arabic reshaper** ثم **bidi** (bidirectional) قبل الرسم.
- في JavaScript يمكن استخدام مكتبات مثل `arabic-reshaper` و `python-bidi` (أو مكافئ JS لـ bidi).
- تأكد أن الخط المستخدم يدعم العربية بالكامل حتى لا تُقطع الحروف.

## ملخص الخيارات

| الطريقة              | RTL | Arabic Shaping | الخطوط العربية   |
|----------------------|-----|----------------|------------------|
| Snappy (wkhtmltopdf) | ✅  | ✅             | Google Fonts ✅   |
| DomPDF               | ⚠️  | ⚠️             | تحتاج خط محلي   |
| طباعة من المتصفح     | ✅  | ✅             | Google Fonts ✅   |

للحصول على أفضل نتيجة مع العقود الحالية: فعّل `CONTRACT_PDF_ENGINE=snappy` وثبّت wkhtmltopdf.
