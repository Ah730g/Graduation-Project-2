<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>عقد إيجار - Contract {{ $contract->id }}</title>
    {{-- DomPDF يستخدم DejaVu Sans (مضمّن ويدعم العربية). Snappy/المتصفح يستخدم Cairo من الرابط أدناه. --}}
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Amiri:wght@400;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            /* DejaVu Sans أولاً لـ DomPDF (خط مضمّن يدعم العربية ويُزيل ???) */
            font-family: "DejaVu Sans", "Cairo", "Amiri", "Traditional Arabic", Arial, sans-serif;
            font-size: 12px;
            line-height: 1.6;
            color: #333;
            padding: 20px;
            direction: rtl;
            unicode-bidi: isolate;
            text-align: right;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #333;
            padding-bottom: 20px;
        }
        .header h1 {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .header h2 {
            font-size: 18px;
            color: #666;
        }
        .section {
            margin-bottom: 25px;
            page-break-inside: avoid;
        }
        .section-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 15px;
            padding: 10px;
            background-color: #f5f5f5;
            border-right: 4px solid #333;
            direction: rtl;
            unicode-bidi: isolate;
        }
        .info-grid {
            display: table;
            width: 100%;
            margin-bottom: 15px;
        }
        .info-row {
            display: table-row;
        }
        .info-label {
            display: table-cell;
            font-weight: bold;
            padding: 8px;
            width: 30%;
            border-bottom: 1px solid #ddd;
            direction: rtl;
            text-align: right;
        }
        .info-value {
            display: table-cell;
            padding: 8px;
            border-bottom: 1px solid #ddd;
            direction: rtl;
            text-align: right;
        }
        .info-value.ltr {
            direction: ltr;
            text-align: left;
        }
        .terms {
            margin-top: 20px;
            padding: 15px;
            background-color: #f9f9f9;
            border: 1px solid #ddd;
            direction: rtl;
            unicode-bidi: isolate;
            text-align: right;
        }
        .terms h3 {
            font-size: 14px;
            margin-bottom: 10px;
        }
        .terms p {
            margin-bottom: 10px;
            text-align: justify;
            direction: rtl;
        }
        .signatures {
            margin-top: 40px;
            display: table;
            width: 100%;
        }
        .signature-box {
            display: table-cell;
            width: 50%;
            padding: 20px;
            text-align: center;
            border-top: 2px solid #333;
            margin-top: 60px;
        }
        .signature-box p {
            margin-top: 10px;
            font-weight: bold;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
        }
        @page {
            margin: 1cm;
        }
    </style>
</head>
<body>
    @php $eng = $pdf_engine ?? 'dompdf'; @endphp
    <div class="header">
        <h1>{{ arabic_pdf('عقد إيجار', $eng) }}</h1>
        <h2>Rental Contract</h2>
        <p>{{ arabic_pdf('رقم العقد', $eng) }} / Contract No: {{ $contract->id }}</p>
        <p>{{ arabic_pdf('تاريخ العقد', $eng) }} / Contract Date: {{ date('Y-m-d', strtotime($contract->created_at)) }}</p>
    </div>

    <!-- Apartment Information -->
    <div class="section">
        <div class="section-title">{{ arabic_pdf('معلومات العقار', $eng) }} / Apartment Information</div>
        <div class="info-grid">
            <div class="info-row">
                <div class="info-label">{{ arabic_pdf('اسم العقار', $eng) }} / Title:</div>
                <div class="info-value">{{ arabic_pdf($contract->post->Title ?? 'N/A', $eng) }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">{{ arabic_pdf('العنوان', $eng) }} / Address:</div>
                <div class="info-value">{{ arabic_pdf($contract->post->Address ?? 'N/A', $eng) }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">{{ arabic_pdf('الإيجار الشهري', $eng) }} / Monthly Rent:</div>
                <div class="info-value">${{ number_format($contract->monthly_rent ?? 0, 2) }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">{{ arabic_pdf('تاريخ البدء', $eng) }} / Start Date:</div>
                <div class="info-value">{{ $contract->start_date ? date('Y-m-d', strtotime($contract->start_date)) : 'N/A' }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">{{ arabic_pdf('تاريخ الانتهاء', $eng) }} / End Date:</div>
                <div class="info-value">{{ $contract->end_date ? date('Y-m-d', strtotime($contract->end_date)) : 'N/A' }}</div>
            </div>
        </div>
    </div>

    <!-- Owner Information -->
    <div class="section">
        <div class="section-title">{{ arabic_pdf('معلومات المالك', $eng) }} / Owner Information</div>
        <div class="info-grid">
            <div class="info-row">
                <div class="info-label">{{ arabic_pdf('الاسم', $eng) }} / Name:</div>
                <div class="info-value">{{ arabic_pdf($contract->post->user->name ?? 'N/A', $eng) }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">{{ arabic_pdf('البريد الإلكتروني', $eng) }} / Email:</div>
                <div class="info-value">{{ $contract->post->user->email ?? 'N/A' }}</div>
            </div>
            @if($ownerIdentity)
            <div class="info-row">
                <div class="info-label">{{ arabic_pdf('الاسم الكامل', $eng) }} / Full Name:</div>
                <div class="info-value">{{ arabic_pdf($ownerIdentity->full_name ?? 'N/A', $eng) }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">{{ arabic_pdf('رقم الهوية', $eng) }} / ID Number:</div>
                <div class="info-value">{{ $ownerIdentity->document_number ?? 'N/A' }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">{{ arabic_pdf('تاريخ الميلاد', $eng) }} / Date of Birth:</div>
                <div class="info-value">{{ $ownerIdentity->date_of_birth ? date('Y-m-d', strtotime($ownerIdentity->date_of_birth)) : 'N/A' }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">{{ arabic_pdf('الجنسية', $eng) }} / Nationality:</div>
                <div class="info-value">{{ arabic_pdf($ownerIdentity->nationality ?? 'N/A', $eng) }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">{{ arabic_pdf('العنوان', $eng) }} / Address:</div>
                <div class="info-value">{{ arabic_pdf($ownerIdentity->address ?? 'N/A', $eng) }}</div>
            </div>
            @endif
        </div>
    </div>

    <!-- Renter Information -->
    <div class="section">
        <div class="section-title">{{ arabic_pdf('معلومات المستأجر', $eng) }} / Renter Information</div>
        <div class="info-grid">
            @php
                $renter = $contract->rentalRequest->user ?? $contract->user ?? null;
            @endphp
            @if($renter)
            <div class="info-row">
                <div class="info-label">{{ arabic_pdf('الاسم', $eng) }} / Name:</div>
                <div class="info-value">{{ arabic_pdf($renter->name ?? 'N/A', $eng) }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">{{ arabic_pdf('البريد الإلكتروني', $eng) }} / Email:</div>
                <div class="info-value">{{ $renter->email ?? 'N/A' }}</div>
            </div>
            @endif
            @if($renterIdentity)
            <div class="info-row">
                <div class="info-label">{{ arabic_pdf('الاسم الكامل', $eng) }} / Full Name:</div>
                <div class="info-value">{{ arabic_pdf($renterIdentity->full_name ?? 'N/A', $eng) }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">{{ arabic_pdf('رقم الهوية', $eng) }} / ID Number:</div>
                <div class="info-value">{{ $renterIdentity->document_number ?? 'N/A' }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">{{ arabic_pdf('تاريخ الميلاد', $eng) }} / Date of Birth:</div>
                <div class="info-value">{{ $renterIdentity->date_of_birth ? date('Y-m-d', strtotime($renterIdentity->date_of_birth)) : 'N/A' }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">{{ arabic_pdf('الجنسية', $eng) }} / Nationality:</div>
                <div class="info-value">{{ arabic_pdf($renterIdentity->nationality ?? 'N/A', $eng) }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">{{ arabic_pdf('العنوان', $eng) }} / Address:</div>
                <div class="info-value">{{ arabic_pdf($renterIdentity->address ?? 'N/A', $eng) }}</div>
            </div>
            @endif
        </div>
    </div>

    <!-- Payment Information -->
    @if($contract->payment)
    <div class="section">
        <div class="section-title">{{ arabic_pdf('معلومات الدفع', $eng) }} / Payment Information</div>
        <div class="info-grid">
            <div class="info-row">
                <div class="info-label">{{ arabic_pdf('المبلغ', $eng) }} / Amount:</div>
                <div class="info-value">${{ number_format($contract->payment->amount ?? 0, 2) }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">{{ arabic_pdf('الحالة', $eng) }} / Status:</div>
                <div class="info-value">{{ $contract->payment->status ?? 'N/A' }}</div>
            </div>
            @if($contract->payment->paid_at)
            <div class="info-row">
                <div class="info-label">{{ arabic_pdf('تاريخ الدفع', $eng) }} / Payment Date:</div>
                <div class="info-value">{{ date('Y-m-d', strtotime($contract->payment->paid_at)) }}</div>
            </div>
            @endif
        </div>
    </div>
    @endif

    <!-- Contract Terms -->
    @if($contract->terms)
    <div class="section">
        <div class="section-title">{{ arabic_pdf('شروط العقد', $eng) }} / Contract Terms</div>
        <div class="terms">
            {!! nl2br(e(arabic_pdf($contract->terms ?? '', $eng))) !!}
        </div>
    </div>
    @endif

    <!-- Signatures -->
    <div class="signatures">
        <div class="signature-box">
            <p>{{ arabic_pdf('توقيع المالك', $eng) }} / Owner Signature</p>
            @if($contract->owner_signature)
                <p style="margin-top: 20px;">{{ arabic_pdf($contract->owner_signature, $eng) }}</p>
                @if($contract->owner_signed_at)
                    <p style="font-size: 10px; margin-top: 5px;">Date: {{ date('Y-m-d', strtotime($contract->owner_signed_at)) }}</p>
                @endif
            @else
                <p style="margin-top: 20px; color: #999;">{{ arabic_pdf('غير موقّع', $eng) }} / Not Signed</p>
            @endif
        </div>
        <div class="signature-box">
            <p>{{ arabic_pdf('توقيع المستأجر', $eng) }} / Renter Signature</p>
            @if($contract->renter_signature)
                <p style="margin-top: 20px;">{{ arabic_pdf($contract->renter_signature, $eng) }}</p>
                @if($contract->renter_signed_at)
                    <p style="font-size: 10px; margin-top: 5px;">Date: {{ date('Y-m-d', strtotime($contract->renter_signed_at)) }}</p>
                @endif
            @else
                <p style="margin-top: 20px; color: #999;">{{ arabic_pdf('غير موقّع', $eng) }} / Not Signed</p>
            @endif
        </div>
    </div>

    <div class="footer">
        <p>{{ arabic_pdf('تم إنشاء هذا العقد إلكترونياً', $eng) }} / This contract was generated electronically</p>
        <p>{{ arabic_pdf('حالة العقد', $eng) }} / Contract Status: {{ $contract->status }}</p>
        @if($contract->cancelled_by_admin)
            <p style="color: red; font-weight: bold;">{{ arabic_pdf('تم إلغاء هذا العقد من قبل الإدارة', $eng) }} / This contract was cancelled by administration</p>
        @endif
    </div>
</body>
</html>

