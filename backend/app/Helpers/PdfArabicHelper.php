<?php

namespace App\Helpers;

use Arphp\Glyphs;

/**
 * معالجة النص العربي لتصدير PDF عبر DomPDF (تشكيل الحروف + ترتيب بصري RTL).
 * لا يُستخدم مع Snappy لأن المتصفح يطبّق التشكيل و RTL تلقائياً.
 */
class PdfArabicHelper
{
    protected static ?Glyphs $glyphs = null;

    /**
     * إرجاع نص مُشكّل ومرتب بصرياً للعرض في DomPDF.
     * عند استخدام Snappy يُرجَع النص كما هو.
     */
    public static function forPdf(?string $text, string $engine = 'dompdf'): string
    {
        if ($text === null || $text === '') {
            return '';
        }
        if ($engine !== 'dompdf') {
            return $text;
        }
        if (!preg_match('/\p{Arabic}/u', $text)) {
            return $text;
        }
        if (self::$glyphs === null) {
            self::$glyphs = new Glyphs();
        }
        return self::$glyphs->utf8Glyphs($text);
    }
}
