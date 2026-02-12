<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Contract PDF Engine
    |--------------------------------------------------------------------------
    |
    | "snappy" = use wkhtmltopdf (Knp Snappy) - أفضل للعربية و RTL (Arabic shaping + RTL).
    | "dompdf" = use DomPDF - قد تظهر العربية مقطوعة/معكوسة إلا مع خطوط محلية.
    |
    */
    'engine' => env('CONTRACT_PDF_ENGINE', 'dompdf'),

    /*
    |--------------------------------------------------------------------------
    | wkhtmltopdf Binary Path (for Snappy)
    |--------------------------------------------------------------------------
    |
    | المسار الكامل لـ wkhtmltopdf أو اسم الأمر إن كان في PATH.
    | أمثلة: 'wkhtmltopdf', 'C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe'
    |
    */
    'wkhtmltopdf' => env('WKHTMLTOPDF_PATH', 'wkhtmltopdf'),

];
