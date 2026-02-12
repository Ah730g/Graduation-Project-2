<?php

if (!function_exists('arabic_pdf')) {
    /**
     * معالجة النص العربي لـ PDF (تشكيل + ترتيب بصري) عند استخدام DomPDF فقط.
     *
     * @param  string|int|float|null  $text
     * @param  string  $engine  'dompdf' أو 'snappy'
     * @return string
     */
    function arabic_pdf(mixed $text, string $engine = 'dompdf'): string
    {
        return \App\Helpers\PdfArabicHelper::forPdf($text === null ? null : (string) $text, $engine);
    }
}
