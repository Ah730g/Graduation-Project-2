<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use App\Models\SavedFloorPlan;

class FloorPlanController extends Controller
{
    public function generate(Request $request)
    {
        // ✅ زيادة وقت التنفيذ الأقصى إلى 5 دقائق (300 ثانية)
        set_time_limit(300);
        ini_set('max_execution_time', 300);
        
        // ✅ تحسين Validation: إضافة حد أقصى للطول
        $validated = $request->validate([
            'description' => 'required|string|min:10|max:2000',
        ], [
            'description.required' => 'الرجاء إدخال وصف العقار',
            'description.min' => 'الوصف يجب أن يكون 10 أحرف على الأقل',
            'description.max' => 'الوصف يجب أن يكون أقل من 2000 حرف',
        ]);

        $description = trim($validated['description']);

        // ✅ التحقق من Cache أولاً
        $cacheKey = 'floor_plan_' . md5($description);
        $cached = Cache::get($cacheKey);
        
        if ($cached !== null) {
            Log::info('Floor plan served from cache', ['cache_key' => $cacheKey]);
            return response()->json($cached, 200, [
                'Content-Type' => 'application/json; charset=utf-8'
            ], JSON_UNESCAPED_UNICODE);
        }

        $apiKey = config('services.openrouter.api_key');
        $endpoint = config('services.openrouter.endpoint');
        $model = config('services.openrouter.model');

        if (!$apiKey) {
            Log::error('OpenRouter API key not configured');
            return response()->json([
                'error' => 'API key not configured.',
                'message' => 'يرجى التحقق من إعدادات API key في ملف .env'
            ], 500);
        }

        try {
            Log::info('Generating floor plan', [
                'description_length' => strlen($description),
                'model' => $model
            ]);

            // ✅ Retry logic: محاولة 3 مرات في حالة الفشل
            $maxRetries = 3;
            $retryDelay = 2; // ثواني
            $response = null;
            $lastError = null;

            for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
                try {
                    $response = Http::withHeaders([
                        'Authorization' => 'Bearer ' . $apiKey,
                        'Content-Type' => 'application/json; charset=utf-8',
                        'Accept' => 'application/json; charset=utf-8',
                        'HTTP-Referer' => config('app.url', 'http://localhost:8000'),
                        'X-Title' => 'Floor Plan Generator',
                    ])
                    ->timeout(240) // ✅ زيادة timeout إلى 240 ثانية (4 دقائق)
                    ->retry(1, 1000) // retry مرة واحدة مع delay 1 ثانية
                    ->post($endpoint, [
                        'model' => $model,
                        'messages' => [
                            ['role' => 'system', 'content' => $this->getSystemPrompt()],
                            ['role' => 'user', 'content' => $description],
                        ],
                        'temperature' => 0.3, // ✅ تقليل من 0.7 إلى 0.3 لدقة أكبر في JSON
                        'max_tokens' => 5000, // ✅ تقليل من 6000 إلى 5000 لتسريع الاستجابة
                        'top_p' => 0.95, // ✅ إضافة top_p لتحسين الجودة
                        'frequency_penalty' => 0.1, // ✅ تقليل التكرار
                    ]);

                    // ✅ إذا نجحت الاستجابة، اخترق من الحلقة
                    if ($response->successful()) {
                        break;
                    }

                    $lastError = $response->json();
                    
                    // ✅ إذا كان الخطأ غير قابل للاسترداد، توقف عن المحاولة
                    if ($response->status() === 400 || $response->status() === 401 || $response->status() === 403) {
                        break;
                    }

                    // ✅ انتظر قبل المحاولة التالية (exponential backoff)
                    if ($attempt < $maxRetries) {
                        sleep($retryDelay * $attempt);
                        Log::warning('Retrying API request', [
                            'attempt' => $attempt + 1,
                            'max_retries' => $maxRetries
                        ]);
                    }

                } catch (\Illuminate\Http\Client\ConnectionException $e) {
                    $lastError = ['error' => ['message' => $e->getMessage()]];
                    
                    // ✅ إذا كان timeout، لا تحاول مرة أخرى (لن يفيد)
                    $isTimeout = strpos($e->getMessage(), 'timeout') !== false || 
                                 strpos($e->getMessage(), 'timed out') !== false ||
                                 strpos($e->getMessage(), 'Connection timed out') !== false;
                    
                    if ($isTimeout) {
                        Log::warning('Request timeout detected, skipping retries', [
                            'attempt' => $attempt,
                            'error' => $e->getMessage()
                        ]);
                        break; // توقف عن المحاولة
                    }
                    
                    // ✅ انتظر قبل المحاولة التالية
                    if ($attempt < $maxRetries) {
                        sleep($retryDelay * $attempt);
                        Log::warning('Retrying after connection error', [
                            'attempt' => $attempt + 1,
                            'error' => $e->getMessage()
                        ]);
                    } else {
                        throw $e; // ✅ إذا فشلت كل المحاولات، ارمِ الاستثناء
                    }
                }
            }

            // ✅ التحقق من نجاح الاستجابة بعد المحاولات
            if (!$response || $response->failed()) {
                $errorDetails = $lastError ?? ($response ? $response->json() : ['error' => ['message' => 'فشل الاتصال بالخدمة']]);
                Log::error('OpenRouter API request failed after retries', [
                    'status' => $response ? $response->status() : 'no response',
                    'error' => $errorDetails,
                    'description_length' => strlen($description),
                    'attempts' => $maxRetries
                ]);
                
                $errorMessage = 'فشل الاتصال بخدمة الذكاء الاصطناعي';
                if (isset($errorDetails['error']['message'])) {
                    $errorMessage = $errorDetails['error']['message'];
                } elseif (is_string($errorDetails)) {
                    $errorMessage = $errorDetails;
                }
                
                return response()->json([
                    'error' => 'فشل الاتصال بخدمة الذكاء الاصطناعي',
                    'message' => config('app.debug') ? $errorMessage : 'يرجى المحاولة مرة أخرى لاحقاً. تأكد من أن مفتاح API صحيح وأن النموذج متاح.',
                ], 500);
            }

            $body = $response->body();
            
            // ✅ إصلاح الترميز قبل تحليل JSON
            $body = $this->fixEncoding($body);
            
            // ✅ محاولة تحليل JSON
            $json = json_decode($body, true);
            
            // ✅ إذا فشل التحليل، سجل الخطأ
            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error('Failed to parse API response JSON', [
                    'json_error' => json_last_error_msg(),
                    'error_code' => json_last_error(),
                    'body_preview' => mb_substr($body, 0, 1000),
                ]);
                
                return response()->json([
                    'error' => 'فشل في تحليل استجابة API',
                    'message' => 'يرجى المحاولة مرة أخرى أو التحقق من إعدادات API',
                ], 500);
            }
            
            // ✅ التحقق من وجود البيانات المطلوبة
            if (!isset($json['choices'][0]['message']['content'])) {
                Log::error('Invalid API response structure', [
                    'response_keys' => array_keys($json ?? []),
                    'has_choices' => isset($json['choices']),
                    'body_preview' => mb_substr($body, 0, 500),
                ]);
                
                return response()->json([
                    'error' => 'استجابة غير صحيحة من خدمة الذكاء الاصطناعي',
                    'message' => 'يرجى المحاولة مرة أخرى أو التحقق من إعدادات API',
                ], 500);
            }
            
            $content = $json['choices'][0]['message']['content'] ?? '';

            // ✅ تنظيف وتحسين المحتوى
            $content = $this->cleanJsonContent($content);
            $content = $this->fixEncoding($content);
            
            // ✅ إزالة أي أحرف تحكم متبقية
            $content = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $content);
            
            // ✅ التحقق من أن المحتوى ليس فارغاً
            if (empty(trim($content))) {
                Log::error('Empty content from AI response', [
                    'body_preview' => mb_substr($body, 0, 500),
                ]);
                
                return response()->json([
                    'error' => 'المحتوى المستلم من الذكاء الاصطناعي فارغ',
                    'message' => 'يرجى المحاولة مرة أخرى أو تحسين الوصف',
                ], 500);
            }

            // ✅ محاولة تحليل JSON مع معالجة أفضل للأخطاء
            $parsed = json_decode($content, true);
            
            // ✅ إذا فشل التحليل، حاول إصلاح JSON تلقائياً
            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::warning('JSON parse error, attempting to fix', [
                    'json_error' => json_last_error_msg(),
                    'error_code' => json_last_error(),
                    'content_preview' => mb_substr($content, 0, 500),
                ]);
                
                // ✅ محاولة إصلاح JSON شائعة
                $content = $this->attemptJsonFix($content);
                
                // ✅ محاولة إزالة أي أحرف غير صالحة من JSON
                $content = $this->sanitizeJsonString($content);
                
                $parsed = json_decode($content, true);
                
                // ✅ إذا فشل مرة أخرى، سجل الخطأ بالتفصيل
                if (json_last_error() !== JSON_ERROR_NONE) {
                    Log::error('JSON parse error after fixes', [
                        'json_error' => json_last_error_msg(),
                        'error_code' => json_last_error(),
                        'content_length' => strlen($content),
                        'content_preview' => mb_substr($content, 0, 1000),
                    ]);
                }
            }

            if (json_last_error() !== JSON_ERROR_NONE || !isset($parsed['rooms']) || !is_array($parsed['rooms'])) {
                Log::error('Failed to parse AI response after fixes', [
                    'json_error' => json_last_error_msg(),
                    'content_preview' => mb_substr($content, 0, 500),
                    'has_rooms' => isset($parsed['rooms']),
                    'rooms_is_array' => isset($parsed['rooms']) && is_array($parsed['rooms'])
                ]);
                
                return response()->json([
                    'error' => 'فشل في معالجة استجابة الذكاء الاصطناعي',
                    'message' => config('app.debug') ? 'خطأ JSON: ' . json_last_error_msg() . ' - ' . mb_substr($content, 0, 300) : 'يرجى المحاولة مرة أخرى أو تحسين الوصف. تأكد من أن النموذج يدعم JSON Mode.',
                ], 500);
            }
            
            // ✅ التحقق من أن rooms مصفوفة وليست فارغة
            if (empty($parsed['rooms']) || !is_array($parsed['rooms'])) {
                Log::error('Empty or invalid rooms array', [
                    'rooms_count' => is_array($parsed['rooms']) ? count($parsed['rooms']) : 'not array',
                ]);
                
                return response()->json([
                    'error' => 'لم يتم العثور على غرف في الاستجابة',
                    'message' => 'يرجى تحسين الوصف وإضافة تفاصيل أكثر عن الغرف',
                ], 500);
            }

            $parsed = $this->fixArabicEncoding($parsed);
            $parsed = $this->validateAndFixRoomNames($parsed, $description);
            $layout = $this->generateSmartLayout($parsed);

            $result = [
                'title' => $parsed['title'] ?? null,
                'property_type' => $parsed['property_type'] ?? 'apartment',
                'total_area_m2' => $parsed['total_area_m2'] ?? null,
                'orientation' => $parsed['orientation'] ?? 'north',
                'raw_rooms' => $parsed['rooms'],
                'layout' => $layout,
            ];

            // ✅ حفظ النتيجة في Cache لمدة ساعة
            Cache::put($cacheKey, $result, now()->addHours(1));
            
            Log::info('Floor plan generated successfully', [
                'rooms_count' => count($parsed['rooms']),
                'total_area' => $parsed['total_area_m2'] ?? null
            ]);

            return response()->json($result, 200, [
                'Content-Type' => 'application/json; charset=utf-8'
            ], JSON_UNESCAPED_UNICODE);

        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('Connection timeout to OpenRouter API', [
                'message' => $e->getMessage(),
                'description_length' => strlen($description),
                'model' => $model
            ]);
            
            // ✅ التحقق من نوع الخطأ
            $errorMessage = 'استغرق الطلب وقتاً طويلاً. يرجى المحاولة مرة أخرى.';
            if (strpos($e->getMessage(), 'timeout') !== false || strpos($e->getMessage(), 'timed out') !== false) {
                $errorMessage = 'انتهت مهلة الاتصال. الطلب يستغرق وقتاً طويلاً جداً. يرجى المحاولة مرة أخرى أو تقصير الوصف.';
            }
            
            return response()->json([
                'error' => 'انتهت مهلة الاتصال',
                'message' => $errorMessage,
            ], 504);
            
        } catch (\Throwable $e) {
            Log::error('Exception in floor plan generation', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
            
            return response()->json([
                'error' => 'حدث خطأ غير متوقع',
                'message' => config('app.debug') ? $e->getMessage() : 'يرجى المحاولة مرة أخرى لاحقاً',
            ], 500);
        }
    }

    /**
     * ✅ System Prompt محسّن بشكل كبير لتحسين دقة النتائج
     */
    private function getSystemPrompt(): string
    {
        return 'أنت خبير معماري متخصص في تحليل أوصاف العقارات العربية. مهمتك: إنتاج JSON فقط بدون أي نص إضافي.

قواعد صارمة:
1. أرجع JSON فقط - بدون markdown أو ```json
2. احتفظ بالأسماء العربية من النص الأصلي بالضبط - لا تغير، لا تترجم، لا تقصر
   أمثلة: "غرفة نوم رئيسية" → "غرفة نوم رئيسية" (ليس "ديه" أو "روم")
3. استخدم الأبعاد المذكورة بدقة 100%: "4م*3.5م" → width_m: 4, height_m: 3.5
4. إذا لم تُذكر أبعاد، استخدم: غرفة نوم (4×3.5م)، رئيسية (5×4.5م)، حمام (2.5×2.5م)، مجلس (6×4م)
5. تأكد من أن مجموع المساحات قريب من المساحة الإجمالية (±10%)

JSON المطلوب:
{
  "title": "عنوان بالعربية",
  "property_type": "apartment|villa|duplex|studio|office",
  "total_area_m2": عدد,
  "orientation": "north|south|east|west",
  "rooms": [{
    "id": "room-1",
    "name": "اسم عربي من النص الأصلي بالضبط",
    "type": "living|kitchen|bedroom|master_bedroom|bathroom|dining|corridor|balcony|storage|office|entrance|other",
    "shape": "rectangle|l_shape|triangle|trapezoid|pentagon|hexagon|custom_polygon",
    "width_m": عدد,
    "height_m": عدد,
    "doors": [{"wall": "north|south|east|west", "position": 0.0-1.0, "width_m": 0.8-1.2, "type": "single|double"}],
    "windows": [{"wall": "north|south|east|west", "position": 0.0-1.0, "width_m": 1.0-2.5}],
    "furniture": ["sofa", "tv", "bed", "wardrobe", "toilet", "sink", ...]
  }]
}

الأثاث حسب النوع:
living: sofa, tv, coffee_table, bookshelf, chair
bedroom: bed, wardrobe, nightstand, desk, chair
master_bedroom: king_bed, wardrobe, nightstand, vanity, chair, bookshelf
kitchen: counter, sink, stove, fridge, dining_table, chairs
bathroom: toilet, sink, shower, vanity
dining: dining_table, chairs, bookshelf
office: desk, chair, bookshelf, coffee_table
balcony: plants, chair, coffee_table
entrance: shoe_rack, chair
storage: shelves

ملاحظات:
- استخدم أرقاماً صحيحة (ليس strings)
- الشكل الافتراضي: "rectangle"
- "غرفة ماستر/رئيسية" → type: "master_bedroom"
- "صالة/مجلس" → type: "living"
- الأهم: الأسماء من النص الأصلي بالضبط

🚫 JSON فقط - لا نص إضافي!';
    }

    private function fixEncoding(string $text): string
    {
        // ✅ إزالة BOM (Byte Order Mark)
        $text = preg_replace('/^\xEF\xBB\xBF/', '', $text);
        
        // ✅ إزالة أحرف التحكم (Control Characters) باستثناء \n, \r, \t
        $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $text);
        
        // ✅ محاولة إصلاح الترميز المشوه (مثل O'U,Oc الذي يحدث عند تلف UTF-8)
        // إذا كان النص يحتوي على أنماط UTF-8 مشوهة، نحاول إصلاحها
        if (preg_match('/[^\x20-\x7E\x{0600}-\x{06FF}\x{0750}-\x{077F}\x{08A0}-\x{08FF}\x{FB50}-\x{FDFF}\x{FE70}-\x{FEFF}\s]/u', $text)) {
            // النص يحتوي على أحرف غير صالحة، نحاول تنظيفه
            $text = mb_convert_encoding($text, 'UTF-8', 'UTF-8');
        }
        
        // ✅ إصلاح الترميز
        if (!mb_check_encoding($text, 'UTF-8')) {
            $detected = mb_detect_encoding($text, ['UTF-8', 'ISO-8859-1', 'Windows-1256', 'ASCII'], true);
            if ($detected && $detected !== 'UTF-8') {
                $text = mb_convert_encoding($text, 'UTF-8', $detected);
            } else {
                // ✅ إذا فشل الكشف، حاول إصلاح UTF-8
                $text = @mb_convert_encoding($text, 'UTF-8', 'UTF-8');
            }
        }
        
        // ✅ إزالة أي أحرف غير صالحة (باستثناء المسافات والأحرف العربية والإنجليزية)
        // نستخدم preg_replace لإزالة الأحرف غير الصالحة بدلاً من filter_var (مهمل في PHP 8.1+)
        $text = preg_replace('/[^\x20-\x7E\x{0600}-\x{06FF}\x{0750}-\x{077F}\x{08A0}-\x{08FF}\x{FB50}-\x{FDFF}\x{FE70}-\x{FEFF}\x{200C}\x{200D}\s]/u', '', $text);
        
        // ✅ إعادة ترميز UTF-8 بشكل صحيح
        $text = mb_convert_encoding($text, 'UTF-8', 'UTF-8');
        
        // ✅ إزالة أي أحرف تحكم متبقية
        $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $text);
        
        return trim($text);
    }

    private function cleanJsonContent(string $content): string
    {
        // ✅ إزالة markdown code blocks
        $content = preg_replace('/```json\s*/i', '', $content);
        $content = preg_replace('/```\s*/', '', $content);
        
        // ✅ إزالة أي نص قبل أول {
        $startPos = strpos($content, '{');
        if ($startPos !== false && $startPos > 0) {
            $content = substr($content, $startPos);
        }
        
        // ✅ إيجاد آخر } مطابق
        $braceCount = 0;
        $endPos = -1;
        for ($i = 0; $i < strlen($content); $i++) {
            if ($content[$i] === '{') {
                $braceCount++;
            } elseif ($content[$i] === '}') {
                $braceCount--;
                if ($braceCount === 0) {
                    $endPos = $i;
                }
            }
        }
        
        if ($endPos !== -1) {
            $content = substr($content, 0, $endPos + 1);
        } else {
            // ✅ إذا فشل، استخدم الطريقة القديمة
            $endPos = strrpos($content, '}');
            if ($endPos !== false) {
                $content = substr($content, 0, $endPos + 1);
            }
        }
        
        return trim($content);
    }

    /**
     * ✅ محاولة إصلاح أخطاء JSON الشائعة
     */
    private function attemptJsonFix(string $content): string
    {
        // ✅ إزالة أحرف التحكم أولاً
        $content = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $content);
        
        // ✅ إزالة trailing commas
        $content = preg_replace('/,\s*([}\]])/', '$1', $content);
        
        // ✅ إصلاح مفاتيح بدون quotes
        $content = preg_replace('/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/', '$1"$2":', $content);
        
        // ✅ إزالة تعليقات JSON غير صحيحة
        $content = preg_replace('/\/\/.*$/m', '', $content);
        $content = preg_replace('/\/\*.*?\*\//s', '', $content);
        
        // ✅ إصلاح أي مشاكل في الترميز داخل النصوص
        $content = mb_convert_encoding($content, 'UTF-8', 'UTF-8');
        
        return trim($content);
    }

    /**
     * ✅ تنظيف سلسلة JSON من الأحرف غير الصالحة
     */
    private function sanitizeJsonString(string $content): string
    {
        // ✅ إزالة أحرف التحكم من داخل النصوص (داخل quotes)
        // نحافظ على \n, \r, \t داخل النصوص
        $content = preg_replace_callback(
            '/"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"/',
            function ($matches) {
                $str = $matches[1];
                // إزالة أحرف التحكم باستثناء \n, \r, \t
                $str = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $str);
                return '"' . $str . '"';
            },
            $content
        );
        
        return $content;
    }

    private function fixArabicEncoding(array $data): array
    {
        array_walk_recursive($data, function (&$value) {
            if (is_string($value)) {
                $value = $this->fixEncoding($value);
            }
        });
        return $data;
    }

    private function generateSmartLayout(array $parsed): array
    {
        $rooms = $parsed['rooms'] ?? [];
        $scale = 50;
        $padding = 150;
        $wallThickness = 0.2;
        $dimensionOffset = 50;

        $sortedRooms = $this->sortRoomsByType($rooms);
        $positionedRooms = $this->calculatePositions($sortedRooms, $scale, $wallThickness);

        $totalWidthM = 0.0;
        $totalHeightM = 0.0;

        foreach ($positionedRooms as $r) {
            $totalWidthM = max($totalWidthM, $r['x_m'] + $r['width_m']);
            $totalHeightM = max($totalHeightM, $r['y_m'] + $r['height_m']);
        }

        $roomsWithFurniture = array_map(function ($room) use ($scale) {
            $room['furniture_items'] = $this->generateFurniture($room, $scale);
            return $room;
        }, $positionedRooms);

        return [
            'scale_px_per_m' => $scale,
            'padding_px' => $padding,
            'dimension_offset_px' => $dimensionOffset,
            'total_width_m' => round($totalWidthM, 2),
            'total_height_m' => round($totalHeightM, 2),
            'total_width_px' => round($totalWidthM * $scale),
            'total_height_px' => round($totalHeightM * $scale),
            'canvas_width_px' => round($totalWidthM * $scale) + ($padding * 2),
            'canvas_height_px' => round($totalHeightM * $scale) + ($padding * 2) + 80,
            'rooms' => $roomsWithFurniture,
            'north_direction' => $parsed['orientation'] ?? 'up',
        ];
    }

    private function sortRoomsByType(array $rooms): array
    {
        $priority = [
            'entrance' => 1, 'corridor' => 2, 'living' => 3, 'dining' => 4,
            'kitchen' => 5, 'office' => 6, 'bedroom' => 7, 'master_bedroom' => 7,
            'bathroom' => 8, 'storage' => 10, 'balcony' => 11, 'other' => 12,
        ];

        usort($rooms, function ($a, $b) use ($priority) {
            $pA = $priority[$a['type'] ?? 'other'] ?? 12;
            $pB = $priority[$b['type'] ?? 'other'] ?? 12;
            return $pA - $pB;
        });

        return $rooms;
    }

    /**
     * ✅ تحسين خوارزمية التخطيط
     * الآن تأخذ في الاعتبار:
     * - حجم الغرف
     * - نوع الغرف (ممرات في المنتصف)
     * - محاولة تجميع الغرف المتشابهة
     */
    private function calculatePositions(array $rooms, int $scale, float $wallThickness): array
    {
        $positioned = [];
        $maxRowWidth = 18.0; // ✅ زيادة العرض الأقصى
        $currentX = 0.0;
        $currentY = 0.0;
        $rowMaxHeight = 0.0;
        $rowRooms = []; // تتبع الغرف في الصف الحالي

        foreach ($rooms as $index => $room) {
            $widthM = max(2.5, (float)($room['width_m'] ?? 4.0));
            $heightM = max(2.5, (float)($room['height_m'] ?? 4.0));
            $roomType = $room['type'] ?? 'other';

            // ✅ تحسين: الممرات والمداخل في المنتصف
            $isCorridor = in_array($roomType, ['corridor', 'entrance']);
            
            // ✅ إذا كانت الغرفة كبيرة أو تجاوزت العرض الأقصى، ابدأ صف جديد
            if ($currentX > 0 && ($currentX + $widthM > $maxRowWidth || ($widthM > 8 && !$isCorridor))) {
                $currentX = 0.0;
                $currentY += $rowMaxHeight + $wallThickness;
                $rowMaxHeight = 0.0;
                $rowRooms = [];
            }

            // ✅ محاولة وضع الممرات في المنتصف
            if ($isCorridor && $currentX > 0 && count($rowRooms) > 0) {
                // احسب المساحة المتاحة في المنتصف
                $midPoint = $maxRowWidth / 2;
                if ($currentX < $midPoint && $currentX + $widthM <= $maxRowWidth) {
                    // يمكن وضع الممر هنا
                } else {
                    // ابدأ صف جديد للممر
                    $currentX = 0.0;
                    $currentY += $rowMaxHeight + $wallThickness;
                    $rowMaxHeight = 0.0;
                    $rowRooms = [];
                }
            }

            $roomName = $this->fixEncoding($room['name'] ?? 'غرفة');
            $shape = $room['shape'] ?? 'rectangle';

            // ✅ حساب بيانات الشكل
            $shapeData = $this->calculateShapeData($room, $scale, $widthM, $heightM);

            // ✅ حساب المساحة الفعلية
            $area = $this->calculateArea($shape, $shapeData, $widthM, $heightM);

            // ✅ دمج الأثاث من الـ AI مع الأثاث الافتراضي حسب نوع الغرفة
            $aiFurniture = $room['furniture'] ?? [];
            $defaultFurniture = $this->getDefaultFurniture($roomType, $area);
            // دمج القائمتين مع إزالة التكرار
            $mergedFurniture = array_unique(array_merge($aiFurniture, $defaultFurniture));
            
            $positioned[] = [
                'id' => $room['id'] ?? 'room-' . ($index + 1),
                'name' => $roomName,
                'name_en' => $room['name_en'] ?? '',
                'type' => $roomType,
                'shape' => $shape,
                'width_m' => round($widthM, 2),
                'height_m' => round($heightM, 2),
                'area_m2' => round($area, 2),
                'x_m' => round($currentX, 2),
                'y_m' => round($currentY, 2),
                'x_px' => round($currentX * $scale),
                'y_px' => round($currentY * $scale),
                'width_px' => round($widthM * $scale),
                'height_px' => round($heightM * $scale),
                'doors' => $room['doors'] ?? [['wall' => 'south', 'position' => 0.5, 'width_m' => 0.9, 'type' => 'single']],
                'windows' => $room['windows'] ?? [],
                'furniture' => $mergedFurniture,
                'shape_data' => $shapeData,
            ];

            $currentX += $widthM + $wallThickness;
            $rowMaxHeight = max($rowMaxHeight, $heightM);
            $rowRooms[] = $room;
        }

        return $positioned;
    }

    /**
     * ✅ حساب بيانات الشكل المتقدمة
     */
    private function calculateShapeData(array $room, int $scale, float $widthM, float $heightM): array
    {
        $shape = $room['shape'] ?? 'rectangle';
        $widthPx = $widthM * $scale;
        $heightPx = $heightM * $scale;

        switch ($shape) {
            case 'pentagon':
                $sides = $room['sides'] ?? [4, 2.5, 2.5, 2, 2];
                return [
                    'sides' => $sides,
                    'sides_count' => 5,
                    'points' => $this->calculatePentagonPoints($sides, $widthPx, $heightPx),
                    'points_m' => $this->calculatePentagonPoints($sides, $widthM, $heightM),
                ];

            case 'hexagon':
                $sides = $room['sides'] ?? [3, 2, 3, 3, 2, 3];
                return [
                    'sides' => $sides,
                    'sides_count' => 6,
                    'points' => $this->calculateHexagonPoints($sides, $widthPx, $heightPx),
                    'points_m' => $this->calculateHexagonPoints($sides, $widthM, $heightM),
                ];

            case 'triangle':
                return [
                    'direction' => $room['direction'] ?? 'up',
                    'points' => $this->calculateTrianglePoints($room['direction'] ?? 'up', $widthPx, $heightPx),
                ];

            case 'trapezoid':
                $topW = ($room['top_width_m'] ?? $widthM * 0.7) * $scale;
                $bottomW = ($room['bottom_width_m'] ?? $widthM) * $scale;
                return [
                    'top_width_px' => $topW,
                    'bottom_width_px' => $bottomW,
                    'top_width_m' => $room['top_width_m'] ?? $widthM * 0.7,
                    'bottom_width_m' => $room['bottom_width_m'] ?? $widthM,
                ];

            case 'l_shape':
                $cutW = ($room['cut_width_m'] ?? $widthM / 3) * $scale;
                $cutH = ($room['cut_height_m'] ?? $heightM / 3) * $scale;
                return [
                    'cut_width_px' => $cutW,
                    'cut_height_px' => $cutH,
                    'cut_width_m' => $room['cut_width_m'] ?? $widthM / 3,
                    'cut_height_m' => $room['cut_height_m'] ?? $heightM / 3,
                    'cut_position' => $room['cut_position'] ?? 'top-right',
                ];

            case 'custom_polygon':
                $points = $room['points'] ?? [];
                return [
                    'points' => array_map(function($p) use ($scale) {
                        return ['x' => $p['x'] * $scale, 'y' => $p['y'] * $scale];
                    }, $points),
                    'points_m' => $points,
                ];

            default:
                return [];
        }
    }

    /**
     * ✅ حساب نقاط الخماسي
     */
    private function calculatePentagonPoints(array $sides, float $width, float $height): array
    {
        // خماسي بأبعاد مخصصة
        // نوزع النقاط بناءً على نسب الأضلاع
        $totalPerimeter = array_sum($sides);
        
        // نقطة البداية في الأعلى الأوسط
        $points = [];
        
        // توزيع النقاط الخمس
        $points[] = ['x' => $width * 0.5, 'y' => 0];                    // أعلى الوسط
        $points[] = ['x' => $width, 'y' => $height * 0.35];            // يمين أعلى
        $points[] = ['x' => $width * 0.8, 'y' => $height];             // يمين أسفل
        $points[] = ['x' => $width * 0.2, 'y' => $height];             // يسار أسفل
        $points[] = ['x' => 0, 'y' => $height * 0.35];                  // يسار أعلى

        return $points;
    }

    /**
     * ✅ حساب نقاط السداسي
     */
    private function calculateHexagonPoints(array $sides, float $width, float $height): array
    {
        $points = [];
        
        $points[] = ['x' => $width * 0.25, 'y' => 0];
        $points[] = ['x' => $width * 0.75, 'y' => 0];
        $points[] = ['x' => $width, 'y' => $height * 0.5];
        $points[] = ['x' => $width * 0.75, 'y' => $height];
        $points[] = ['x' => $width * 0.25, 'y' => $height];
        $points[] = ['x' => 0, 'y' => $height * 0.5];

        return $points;
    }

    /**
     * ✅ حساب نقاط المثلث
     */
    private function calculateTrianglePoints(string $direction, float $width, float $height): array
    {
        switch ($direction) {
            case 'up':
                return [
                    ['x' => $width / 2, 'y' => 0],
                    ['x' => $width, 'y' => $height],
                    ['x' => 0, 'y' => $height],
                ];
            case 'down':
                return [
                    ['x' => 0, 'y' => 0],
                    ['x' => $width, 'y' => 0],
                    ['x' => $width / 2, 'y' => $height],
                ];
            case 'left':
                return [
                    ['x' => 0, 'y' => $height / 2],
                    ['x' => $width, 'y' => 0],
                    ['x' => $width, 'y' => $height],
                ];
            case 'right':
                return [
                    ['x' => 0, 'y' => 0],
                    ['x' => $width, 'y' => $height / 2],
                    ['x' => 0, 'y' => $height],
                ];
            default:
                return [
                    ['x' => $width / 2, 'y' => 0],
                    ['x' => $width, 'y' => $height],
                    ['x' => 0, 'y' => $height],
                ];
        }
    }

    /**
     * ✅ حساب المساحة حسب الشكل
     */
    private function calculateArea(string $shape, array $shapeData, float $width, float $height): float
    {
        switch ($shape) {
            case 'triangle':
                return 0.5 * $width * $height;

            case 'trapezoid':
                $topW = $shapeData['top_width_m'] ?? $width * 0.7;
                $bottomW = $shapeData['bottom_width_m'] ?? $width;
                return 0.5 * ($topW + $bottomW) * $height;

            case 'l_shape':
                $cutW = $shapeData['cut_width_m'] ?? $width / 3;
                $cutH = $shapeData['cut_height_m'] ?? $height / 3;
                return ($width * $height) - ($cutW * $cutH);

            case 'pentagon':
                // تقريب: حوالي 70% من المستطيل المحيط
                return $width * $height * 0.7;

            case 'hexagon':
                // تقريب: حوالي 75% من المستطيل المحيط
                return $width * $height * 0.75;

            case 'custom_polygon':
                // استخدام صيغة Shoelace لحساب المساحة
                $points = $shapeData['points_m'] ?? [];
                return $this->calculatePolygonArea($points);

            default:
                return $width * $height;
        }
    }

    /**
     * ✅ حساب مساحة المضلع (صيغة Shoelace)
     */
    private function calculatePolygonArea(array $points): float
    {
        $n = count($points);
        if ($n < 3) return 0;

        $area = 0;
        for ($i = 0; $i < $n; $i++) {
            $j = ($i + 1) % $n;
            $area += $points[$i]['x'] * $points[$j]['y'];
            $area -= $points[$j]['x'] * $points[$i]['y'];
        }

        return abs($area) / 2;
    }

    /**
     * ✅ تحسين دالة إضافة الأثاث الافتراضي
     * الآن تأخذ في الاعتبار حجم الغرفة لتحديد كمية الأثاث المناسبة
     */
    private function getDefaultFurniture(string $type, float $area = 0): array
    {
        $defaults = [
            'living' => function($area) {
                $furniture = ['sofa', 'tv', 'coffee_table'];
                if ($area > 20) {
                    $furniture[] = 'bookshelf';
                }
                if ($area > 30) {
                    $furniture[] = 'chair';
                }
                return $furniture;
            },
            'bedroom' => function($area) {
                $furniture = ['bed', 'wardrobe'];
                if ($area > 12) {
                    $furniture[] = 'nightstand';
                }
                if ($area > 18) {
                    $furniture[] = 'desk';
                    $furniture[] = 'chair';
                }
                return $furniture;
            },
            'master_bedroom' => function($area) {
                $furniture = ['king_bed', 'wardrobe'];
                if ($area > 15) {
                    $furniture[] = 'nightstand';
                }
                if ($area > 20) {
                    $furniture[] = 'vanity';
                }
                if ($area > 25) {
                    $furniture[] = 'chair';
                    $furniture[] = 'bookshelf';
                }
                return $furniture;
            },
            'kitchen' => function($area) {
                $furniture = ['counter', 'sink'];
                if ($area > 8) {
                    $furniture[] = 'stove';
                }
                if ($area > 10) {
                    $furniture[] = 'fridge';
                }
                if ($area > 15) {
                    $furniture[] = 'dining_table';
                    $furniture[] = 'chairs';
                }
                return $furniture;
            },
            'bathroom' => function($area) {
                $furniture = ['toilet', 'sink'];
                if ($area > 4) {
                    $furniture[] = 'shower';
                }
                if ($area > 8) {
                    $furniture[] = 'vanity';
                }
                return $furniture;
            },
            'dining' => function($area) {
                $furniture = ['dining_table'];
                if ($area > 12) {
                    $furniture[] = 'chairs';
                }
                if ($area > 20) {
                    $furniture[] = 'bookshelf';
                }
                return $furniture;
            },
            'office' => function($area) {
                $furniture = ['desk', 'chair'];
                if ($area > 10) {
                    $furniture[] = 'bookshelf';
                }
                if ($area > 15) {
                    $furniture[] = 'coffee_table';
                }
                return $furniture;
            },
            'balcony' => function($area) {
                $furniture = [];
                if ($area > 3) {
                    $furniture[] = 'plants';
                }
                if ($area > 5) {
                    $furniture[] = 'chair';
                }
                if ($area > 8) {
                    $furniture[] = 'coffee_table';
                }
                return $furniture;
            },
            'entrance' => function($area) {
                $furniture = [];
                if ($area > 3) {
                    $furniture[] = 'shoe_rack';
                }
                if ($area > 6) {
                    $furniture[] = 'chair';
                }
                return $furniture;
            },
            'corridor' => function($area) {
                return [];
            },
            'storage' => function($area) {
                $furniture = ['shelves'];
                if ($area > 8) {
                    $furniture[] = 'shelves';
                }
                return $furniture;
            },
        ];

        $furnitureFunction = $defaults[$type] ?? null;
        if ($furnitureFunction && is_callable($furnitureFunction)) {
            return $furnitureFunction($area);
        }

        return [];
    }

    private function generateFurniture(array $room, int $scale): array
    {
        $items = [];
        $furniture = $room['furniture'] ?? [];
        $roomW = $room['width_px'];
        $roomH = $room['height_px'];

        $config = [
            'sofa' => ['w' => 80, 'h' => 35, 'pos' => 'bottom-center'],
            'tv' => ['w' => 50, 'h' => 10, 'pos' => 'top-center'],
            'coffee_table' => ['w' => 40, 'h' => 25, 'pos' => 'center'],
            'bed' => ['w' => 60, 'h' => 70, 'pos' => 'top-center'],
            'king_bed' => ['w' => 75, 'h' => 80, 'pos' => 'top-center'],
            'wardrobe' => ['w' => 50, 'h' => 20, 'pos' => 'left-top'],
            'nightstand' => ['w' => 20, 'h' => 20, 'pos' => 'top-right'],
            'vanity' => ['w' => 35, 'h' => 20, 'pos' => 'right-center'],
            'desk' => ['w' => 45, 'h' => 25, 'pos' => 'bottom-left'],
            'counter' => ['w' => 70, 'h' => 20, 'pos' => 'top'],
            'stove' => ['w' => 30, 'h' => 25, 'pos' => 'top-right'],
            'fridge' => ['w' => 30, 'h' => 30, 'pos' => 'right-top'],
            'sink' => ['w' => 25, 'h' => 20, 'pos' => 'top-center'],
            'toilet' => ['w' => 20, 'h' => 25, 'pos' => 'bottom-left'],
            'shower' => ['w' => 35, 'h' => 35, 'pos' => 'top-right'],
            'dining_table' => ['w' => 60, 'h' => 40, 'pos' => 'center'],
            'chairs' => ['w' => 20, 'h' => 20, 'pos' => 'around'],
            'bookshelf' => ['w' => 40, 'h' => 15, 'pos' => 'left-center'],
            'chair' => ['w' => 25, 'h' => 25, 'pos' => 'center'],
            'plants' => ['w' => 20, 'h' => 20, 'pos' => 'corners'],
            'shoe_rack' => ['w' => 35, 'h' => 15, 'pos' => 'left'],
            'shelves' => ['w' => 50, 'h' => 15, 'pos' => 'top'],
        ];

        foreach ($furniture as $item) {
            if (!isset($config[$item])) continue;
            
            $c = $config[$item];
            $pos = $this->calcPos($c['pos'], $roomW, $roomH, $c['w'], $c['h']);

            $items[] = [
                'type' => $item,
                'x' => $pos['x'],
                'y' => $pos['y'],
                'width' => min($c['w'], $roomW * 0.4),
                'height' => min($c['h'], $roomH * 0.4),
            ];
        }

        return $items;
    }

    private function calcPos(string $pos, float $rW, float $rH, float $iW, float $iH): array
    {
        $p = 10;
        $positions = [
            'center' => ['x' => ($rW - $iW) / 2, 'y' => ($rH - $iH) / 2],
            'top-center' => ['x' => ($rW - $iW) / 2, 'y' => $p],
            'bottom-center' => ['x' => ($rW - $iW) / 2, 'y' => $rH - $iH - $p],
            'left-center' => ['x' => $p, 'y' => ($rH - $iH) / 2],
            'right-center' => ['x' => $rW - $iW - $p, 'y' => ($rH - $iH) / 2],
            'top-left' => ['x' => $p, 'y' => $p],
            'top-right' => ['x' => $rW - $iW - $p, 'y' => $p],
            'bottom-left' => ['x' => $p, 'y' => $rH - $iH - $p],
            'bottom-right' => ['x' => $rW - $iW - $p, 'y' => $rH - $iH - $p],
            'left-top' => ['x' => $p, 'y' => $p + 20],
            'right-top' => ['x' => $rW - $iW - $p, 'y' => $p + 20],
            'top' => ['x' => ($rW - $iW) / 2, 'y' => $p],
            'left' => ['x' => $p, 'y' => ($rH - $iH) / 2],
            'right' => ['x' => $rW - $iW - $p, 'y' => ($rH - $iH) / 2],
            'corners' => ['x' => $p, 'y' => $p],
            'around' => ['x' => ($rW - $iW) / 2, 'y' => $rH - $iH - $p],
        ];

        return $positions[$pos] ?? $positions['center'];
    }

    /**
     * ✅ توليد مخطط يدوياً بدون استخدام AI
     */
    public function generateManual(Request $request)
    {
        try {
            $validated = $request->validate([
                'title' => 'required|string|max:200',
                'property_type' => 'required|string|in:apartment,villa,duplex,studio,office',
                'total_area_m2' => 'nullable|numeric|min:10|max:10000',
                'orientation' => 'required|string|in:north,south,east,west',
                'rooms' => 'required|array|min:1',
                'rooms.*.id' => 'nullable|string|max:100',
                'rooms.*.name' => 'required|string|max:100',
                'rooms.*.type' => 'required|string|in:living,kitchen,bedroom,master_bedroom,bathroom,dining,corridor,entrance,storage,office,balcony,other',
                'rooms.*.width_m' => 'required|numeric|min:1|max:50',
                'rooms.*.height_m' => 'required|numeric|min:1|max:50',
                'rooms.*.shape' => 'required|string|in:rectangle,l_shape,triangle,trapezoid,pentagon,hexagon',
                'rooms.*.doors' => 'nullable|array',
                'rooms.*.doors.*.wall' => 'required_with:rooms.*.doors|string|in:north,south,east,west',
                'rooms.*.doors.*.position' => 'required_with:rooms.*.doors|numeric|min:0|max:1',
                'rooms.*.doors.*.width_m' => 'required_with:rooms.*.doors|numeric|min:0.6|max:2.5',
                'rooms.*.doors.*.type' => 'nullable|string|in:single,double',
                'rooms.*.windows' => 'nullable|array',
                'rooms.*.windows.*.wall' => 'required_with:rooms.*.windows|string|in:north,south,east,west',
                'rooms.*.windows.*.position' => 'required_with:rooms.*.windows|numeric|min:0|max:1',
                'rooms.*.windows.*.width_m' => 'required_with:rooms.*.windows|numeric|min:0.5|max:3',
                'rooms.*.furniture' => 'nullable|array',
            ], [
                'title.required' => 'الرجاء إدخال عنوان للمخطط',
                'rooms.required' => 'الرجاء إضافة غرفة واحدة على الأقل',
                'rooms.min' => 'يجب إضافة غرفة واحدة على الأقل',
                'rooms.*.name.required' => 'الرجاء إدخال اسم لكل غرفة',
                'rooms.*.width_m.required' => 'الرجاء إدخال عرض لكل غرفة',
                'rooms.*.height_m.required' => 'الرجاء إدخال طول لكل غرفة',
            ]);

            // تحويل البيانات إلى التنسيق المطلوب
            $parsed = [
                'title' => $validated['title'],
                'property_type' => $validated['property_type'],
                'total_area_m2' => $validated['total_area_m2'] ?? null,
                'orientation' => $validated['orientation'],
                'rooms' => array_map(function($room, $index) {
                    return [
                        'id' => $room['id'] ?? "room-" . ($index + 1),
                        'name' => $room['name'],
                        'type' => $room['type'],
                        'shape' => $room['shape'],
                        'width_m' => (float)$room['width_m'],
                        'height_m' => (float)$room['height_m'],
                        'doors' => $room['doors'] ?? [],
                        'windows' => $room['windows'] ?? [],
                        'furniture' => $room['furniture'] ?? [],
                    ];
                }, $validated['rooms'], array_keys($validated['rooms']))
            ];

            // استخدام نفس دالة generateSmartLayout لإنشاء المخطط
            $layout = $this->generateSmartLayout($parsed);

            Log::info('Manual floor plan generated successfully', [
                'rooms_count' => count($parsed['rooms']),
                'title' => $parsed['title']
            ]);

            return response()->json([
                'title' => $parsed['title'],
                'property_type' => $parsed['property_type'],
                'total_area_m2' => $parsed['total_area_m2'],
                'orientation' => $parsed['orientation'],
                'layout' => $layout,
            ], 200, [
                'Content-Type' => 'application/json; charset=utf-8'
            ], JSON_UNESCAPED_UNICODE);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'خطأ في التحقق من البيانات',
                'message' => $e->getMessage(),
                'errors' => $e->errors(),
            ], 422, [], JSON_UNESCAPED_UNICODE);
        } catch (\Throwable $e) {
            Log::error('Exception in manual floor plan generation', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
            
            return response()->json([
                'error' => 'حدث خطأ غير متوقع',
                'message' => config('app.debug') ? $e->getMessage() : 'يرجى المحاولة مرة أخرى لاحقاً',
            ], 500, [], JSON_UNESCAPED_UNICODE);
        }
    }

    /**
     * ✅ حفظ المخطط المعدل في قاعدة البيانات
     */
    public function save(Request $request)
    {
        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'property_type' => 'nullable|string|max:50',
            'total_area_m2' => 'nullable|numeric|min:0',
            'orientation' => 'nullable|string|max:50',
            'layout' => 'required|array',
            'description' => 'nullable|string|max:2000',
        ], [
            'layout.required' => 'الرجاء إرسال بيانات المخطط',
            'layout.array' => 'بيانات المخطط يجب أن تكون مصفوفة',
        ]);

        try {
            $savedPlan = SavedFloorPlan::create([
                'user_id' => auth()->id(), // null إذا لم يكن المستخدم مسجل دخول
                'title' => $validated['title'] ?? null,
                'property_type' => $validated['property_type'] ?? 'apartment',
                'total_area_m2' => $validated['total_area_m2'] ?? null,
                'orientation' => $validated['orientation'] ?? 'north',
                'layout_data' => $validated['layout'],
                'description' => $validated['description'] ?? null,
            ]);

            Log::info('Floor plan saved successfully', [
                'plan_id' => $savedPlan->id,
                'user_id' => auth()->id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'تم حفظ المخطط بنجاح',
                'plan_id' => $savedPlan->id,
            ], 200, [
                'Content-Type' => 'application/json; charset=utf-8'
            ], JSON_UNESCAPED_UNICODE);

        } catch (\Throwable $e) {
            Log::error('Failed to save floor plan', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'فشل حفظ المخطط',
                'message' => config('app.debug') ? $e->getMessage() : 'يرجى المحاولة مرة أخرى',
            ], 500, [
                'Content-Type' => 'application/json; charset=utf-8'
            ], JSON_UNESCAPED_UNICODE);
        }
    }

    /**
     * ✅ التحقق من أسماء الغرف وإصلاحها بناءً على الوصف الأصلي
     */
    private function validateAndFixRoomNames(array $parsed, string $originalDescription): array
    {
        if (!isset($parsed['rooms']) || !is_array($parsed['rooms'])) {
            return $parsed;
        }

        // استخراج أسماء الغرف من الوصف الأصلي
        $originalRoomNames = $this->extractRoomNamesFromDescription($originalDescription);
        
        // استخراج الأبعاد من الوصف الأصلي
        $originalDimensions = $this->extractDimensionsFromDescription($originalDescription);
        
        // خريطة للربط بين أنواع الغرف والأسماء المحتملة
        $roomTypeMap = [
            'master_bedroom' => ['غرفة نوم رئيسية', 'غرفة رئيسية', 'ماستر', 'غرفة ماستر'],
            'bedroom' => ['غرفة نوم', 'غرفة نوم الأطفال', 'غرفة نوم متوسطة', 'غرفة نوم صغيرة'],
            'bathroom' => ['حمام', 'حمام كبير', 'حمام الضيوف', 'حمام صغير'],
            'living' => ['مجلس', 'مجلس الضيوف', 'صالة', 'صالة جلوس', 'صالة المعيشة'],
            'kitchen' => ['مطبخ', 'المطبخ'],
            'dining' => ['غرفة طعام', 'صالة طعام'],
        ];

        foreach ($parsed['rooms'] as $index => &$room) {
            $roomType = $room['type'] ?? 'other';
            $currentName = $room['name'] ?? '';
            
            // إذا كان الاسم غير صحيح (يحتوي على "ديه" أو "روم" أو أسماء غير منطقية)
            if ($this->isInvalidRoomName($currentName)) {
                // محاولة العثور على اسم صحيح من الوصف الأصلي
                $correctName = $this->findCorrectRoomName($roomType, $currentName, $originalRoomNames, $roomTypeMap);
                
                if ($correctName) {
                    $room['name'] = $correctName;
                    Log::info('Fixed room name', [
                        'old_name' => $currentName,
                        'new_name' => $correctName,
                        'room_type' => $roomType
                    ]);
                    
                    // محاولة إصلاح الأبعاد بناءً على الاسم الصحيح
                    $correctDimensions = $this->findDimensionsForRoom($correctName, $originalDimensions);
                    if ($correctDimensions) {
                        $room['width_m'] = $correctDimensions['width'];
                        $room['height_m'] = $correctDimensions['height'];
                        Log::info('Fixed room dimensions', [
                            'room_name' => $correctName,
                            'dimensions' => $correctDimensions
                        ]);
                    }
                } else {
                    // إذا لم نجد اسم صحيح، استخدم اسم افتراضي بناءً على النوع
                    $room['name'] = $this->getDefaultRoomName($roomType, $index);
                }
            } else {
                // حتى لو كان الاسم صحيحاً، تحقق من الأبعاد
                $correctDimensions = $this->findDimensionsForRoom($currentName, $originalDimensions);
                if ($correctDimensions) {
                    $currentWidth = (float)($room['width_m'] ?? 0);
                    $currentHeight = (float)($room['height_m'] ?? 0);
                    $expectedWidth = $correctDimensions['width'];
                    $expectedHeight = $correctDimensions['height'];
                    
                    // إذا كانت الأبعاد مختلفة بشكل كبير (أكثر من 0.5 متر)
                    if (abs($currentWidth - $expectedWidth) > 0.5 || abs($currentHeight - $expectedHeight) > 0.5) {
                        $room['width_m'] = $expectedWidth;
                        $room['height_m'] = $expectedHeight;
                        Log::info('Fixed room dimensions', [
                            'room_name' => $currentName,
                            'old_dimensions' => ['width' => $currentWidth, 'height' => $currentHeight],
                            'new_dimensions' => $correctDimensions
                        ]);
                    }
                }
            }
        }

        return $parsed;
    }

    /**
     * ✅ استخراج الأبعاد من الوصف الأصلي
     */
    private function extractDimensionsFromDescription(string $description): array
    {
        $dimensions = [];
        
        // نمط للبحث عن الأبعاد: (4م*3.5م) أو (4م × 3.5م) أو (4 م * 3.5 م)
        // يحاول التقاط اسم الغرفة قبل الأبعاد
        $pattern = '/([^،,()]+?)\s*[\(（]\s*([\d.]+)\s*[مm]\s*[*×x]\s*([\d.]+)\s*[مm]\s*[\)）]/iu';
        
        if (preg_match_all($pattern, $description, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $match) {
                $roomName = trim($match[1]);
                $width = (float)$match[2];
                $height = (float)$match[3];
                
                // تنظيف اسم الغرفة من علامات الترقيم والمسافات الزائدة
                $roomName = trim($roomName);
                $roomName = rtrim($roomName, '،,.)');
                
                // إذا كان الاسم فارغاً أو قصيراً جداً، حاول العثور على اسم الغرفة قبل هذا النمط
                if (mb_strlen($roomName) < 3) {
                    // البحث عن آخر اسم غرفة قبل هذا النمط
                    $pos = mb_strpos($description, $match[0]);
                    if ($pos !== false && $pos > 0) {
                        $beforeText = mb_substr($description, max(0, $pos - 50), $pos);
                        $roomNameFromBefore = $this->extractRoomNameFromContext($beforeText);
                        if ($roomNameFromBefore) {
                            $roomName = $roomNameFromBefore;
                        }
                    }
                }
                
                if (mb_strlen($roomName) >= 3) {
                    $dimensions[] = [
                        'name' => $roomName,
                        'width' => $width,
                        'height' => $height,
                    ];
                }
            }
        }
        
        return $dimensions;
    }

    /**
     * ✅ استخراج اسم الغرفة من السياق
     */
    private function extractRoomNameFromContext(string $text): ?string
    {
        // البحث عن آخر اسم غرفة في النص
        $patterns = [
            '/غرفة\s+نوم\s+رئيسية/iu',
            '/غرفة\s+نوم\s+الأطفال/iu',
            '/غرفة\s+نوم\s+متوسطة/iu',
            '/غرفة\s+نوم/iu',
            '/حمام\s+كبير/iu',
            '/حمام\s+الضيوف/iu',
            '/حمام/iu',
            '/مجلس\s+الضيوف/iu',
            '/مجلس/iu',
            '/صالة/iu',
            '/مطبخ/iu',
        ];

        $foundNames = [];
        foreach ($patterns as $pattern) {
            if (preg_match_all($pattern, $text, $matches)) {
                foreach ($matches[0] as $match) {
                    $foundNames[] = trim($match);
                }
            }
        }

        // إرجاع آخر اسم وجد
        return !empty($foundNames) ? end($foundNames) : null;
    }

    /**
     * ✅ العثور على الأبعاد المناسبة للغرفة
     */
    private function findDimensionsForRoom(string $roomName, array $originalDimensions): ?array
    {
        foreach ($originalDimensions as $dim) {
            $dimName = $dim['name'];
            
            // مطابقة مباشرة
            if (mb_stripos($roomName, $dimName) !== false || mb_stripos($dimName, $roomName) !== false) {
                return ['width' => $dim['width'], 'height' => $dim['height']];
            }
            
            // مطابقة جزئية (مثل "غرفة نوم رئيسية" مع "غرفة نوم رئيسية (4م*3.5م)")
            $roomWords = preg_split('/\s+/', $roomName);
            $dimWords = preg_split('/\s+/', $dimName);
            
            $matchCount = 0;
            foreach ($roomWords as $word) {
                foreach ($dimWords as $dimWord) {
                    if (mb_stripos($dimWord, $word) !== false || mb_stripos($word, $dimWord) !== false) {
                        $matchCount++;
                        break;
                    }
                }
            }
            
            // إذا تطابق أكثر من كلمة واحدة
            if ($matchCount >= 2) {
                return ['width' => $dim['width'], 'height' => $dim['height']];
            }
        }
        
        return null;
    }

    /**
     * ✅ استخراج أسماء الغرف من الوصف الأصلي
     */
    private function extractRoomNamesFromDescription(string $description): array
    {
        $roomNames = [];
        
        // أنماط للبحث عن أسماء الغرف (مرتبة من الأكثر تحديداً إلى الأقل)
        $patterns = [
            '/غرفة\s+نوم\s+رئيسية[^\s،,]*/iu',
            '/غرفة\s+نوم\s+الأطفال[^\s،,]*/iu',
            '/غرفة\s+نوم\s+متوسطة[^\s،,]*/iu',
            '/غرفة\s+نوم\s+صغيرة[^\s،,]*/iu',
            '/حمام\s+كبير[^\s،,]*/iu',
            '/حمام\s+الضيوف[^\s،,]*/iu',
            '/مجلس\s+الضيوف[^\s،,]*/iu',
            '/صالة\s+جلوس[^\s،,]*/iu',
            '/صالة\s+المعيشة[^\s،,]*/iu',
            '/غرفة\s+طعام[^\s،,]*/iu',
            '/غرفة\s+نوم[^\s،,]*/iu',
            '/حمام[^\s،,]*/iu',
            '/مجلس[^\s،,]*/iu',
            '/صالة[^\s،,]*/iu',
            '/مطبخ[^\s،,]*/iu',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match_all($pattern, $description, $matches)) {
                foreach ($matches[0] as $match) {
                    $cleaned = trim($match);
                    // إزالة علامات الترقيم في النهاية
                    $cleaned = rtrim($cleaned, '،,.)');
                    if (mb_strlen($cleaned) >= 3) {
                        $roomNames[] = $cleaned;
                    }
                }
            }
        }

        // إزالة التكرار مع الحفاظ على الترتيب
        $uniqueNames = [];
        foreach ($roomNames as $name) {
            $found = false;
            foreach ($uniqueNames as $existing) {
                // إذا كان الاسم موجوداً أو جزء من اسم موجود
                if (mb_stripos($existing, $name) !== false || mb_stripos($name, $existing) !== false) {
                    // احتفظ بالاسم الأطول (الأكثر تحديداً)
                    if (mb_strlen($name) > mb_strlen($existing)) {
                        $uniqueNames = array_filter($uniqueNames, function($e) use ($existing) {
                            return $e !== $existing;
                        });
                        $uniqueNames = array_values($uniqueNames);
                        $uniqueNames[] = $name;
                    }
                    $found = true;
                    break;
                }
            }
            if (!$found) {
                $uniqueNames[] = $name;
            }
        }

        return $uniqueNames;
    }

    /**
     * ✅ التحقق من صحة اسم الغرفة
     */
    private function isInvalidRoomName(string $name): bool
    {
        $invalidPatterns = [
            '/^ديه/i',
            '/^روم/i',
            '/^room/i',
            '/^this/i',
            '/^that/i',
            '/^the/i',
            '/^a\s/i',
            '/^an\s/i',
        ];

        foreach ($invalidPatterns as $pattern) {
            if (preg_match($pattern, $name)) {
                return true;
            }
        }

        // إذا كان الاسم قصير جداً أو فارغ
        if (mb_strlen(trim($name)) < 3) {
            return true;
        }

        return false;
    }

    /**
     * ✅ العثور على اسم صحيح للغرفة
     */
    private function findCorrectRoomName(string $roomType, string $currentName, array $originalRoomNames, array $roomTypeMap): ?string
    {
        // أولاً: البحث المباشر في الأسماء الأصلية بناءً على نوع الغرفة
        foreach ($originalRoomNames as $originalName) {
            if ($this->matchesRoomType($originalName, $roomType, $roomTypeMap)) {
                return $originalName;
            }
        }

        // ثانياً: البحث في الأسماء الأصلية المستخرجة من الوصف
        $possibleNames = $roomTypeMap[$roomType] ?? [];
        
        foreach ($originalRoomNames as $originalName) {
            // إذا تطابق نوع الغرفة مع الاسم الأصلي
            foreach ($possibleNames as $possibleName) {
                if (mb_stripos($originalName, $possibleName) !== false || mb_stripos($possibleName, $originalName) !== false) {
                    return $originalName;
                }
            }
        }

        // ثالثاً: إذا كان هناك اسم واحد فقط من نفس النوع، استخدمه
        $matchingNames = [];
        foreach ($originalRoomNames as $originalName) {
            if ($this->matchesRoomType($originalName, $roomType, $roomTypeMap)) {
                $matchingNames[] = $originalName;
            }
        }
        
        if (count($matchingNames) === 1) {
            return $matchingNames[0];
        }

        return null;
    }

    /**
     * ✅ التحقق من تطابق اسم الغرفة مع نوعها
     */
    private function matchesRoomType(string $roomName, string $roomType, array $roomTypeMap): bool
    {
        $possibleNames = $roomTypeMap[$roomType] ?? [];
        
        foreach ($possibleNames as $possibleName) {
            if (mb_stripos($roomName, $possibleName) !== false) {
                return true;
            }
        }

        return false;
    }

    /**
     * ✅ الحصول على اسم افتراضي للغرفة بناءً على نوعها
     */
    private function getDefaultRoomName(string $roomType, int $index): string
    {
        $defaultNames = [
            'master_bedroom' => 'غرفة نوم رئيسية',
            'bedroom' => 'غرفة نوم',
            'bathroom' => 'حمام',
            'living' => 'صالة',
            'kitchen' => 'مطبخ',
            'dining' => 'غرفة طعام',
            'office' => 'مكتب',
            'storage' => 'مخزن',
            'balcony' => 'بلكونة',
            'corridor' => 'ممر',
            'entrance' => 'مدخل',
        ];

        $baseName = $defaultNames[$roomType] ?? 'غرفة';
        
        // إذا كان هناك أكثر من غرفة من نفس النوع، أضف رقم
        if ($index > 0) {
            return $baseName . ' ' . ($index + 1);
        }

        return $baseName;
    }
}