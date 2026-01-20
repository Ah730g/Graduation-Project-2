<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ ucfirst($type) }} Report - {{ date('Y-m-d') }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Arial', 'DejaVu Sans', sans-serif;
            font-size: 12px;
            line-height: 1.6;
            color: #333;
            padding: 20px;
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
            border-left: 4px solid #333;
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
            width: 40%;
            border-bottom: 1px solid #ddd;
        }
        .info-value {
            display: table-cell;
            padding: 8px;
            border-bottom: 1px solid #ddd;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        table th, table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        table th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 20px;
        }
        .stat-box {
            padding: 15px;
            background-color: #f9f9f9;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .stat-label {
            font-size: 11px;
            color: #666;
            margin-bottom: 5px;
        }
        .stat-value {
            font-size: 20px;
            font-weight: bold;
            color: #333;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ ucfirst($type) }} Report</h1>
        <h2>Period: {{ $report['period']['start_formatted'] }} - {{ $report['period']['end_formatted'] }}</h2>
        <p>Generated on: {{ date('Y-m-d H:i:s') }}</p>
    </div>

    <div class="section">
        <div class="section-title">Summary Statistics</div>
        <div class="stats-grid">
            <div class="stat-box">
                <div class="stat-label">New Users</div>
                <div class="stat-value">{{ $report['summary']['new_users'] }}</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">New Apartments</div>
                <div class="stat-value">{{ $report['summary']['new_apartments'] }}</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">New Booking Requests</div>
                <div class="stat-value">{{ $report['summary']['new_booking_requests'] }}</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Signed Contracts</div>
                <div class="stat-value">{{ $report['summary']['signed_contracts'] }}</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Payments Received</div>
                <div class="stat-value">{{ $report['summary']['payments_received'] }}</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Total Revenue</div>
                <div class="stat-value">${{ number_format($report['summary']['total_revenue'], 2) }}</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">New Support Tickets</div>
                <div class="stat-value">{{ $report['summary']['new_support_tickets'] }}</div>
            </div>
        </div>
    </div>

    @if(isset($report['growth']))
    <div class="section">
        <div class="section-title">Growth Rate</div>
        <div class="info-grid">
            <div class="info-row">
                <div class="info-label">Users Growth</div>
                <div class="info-value">{{ $report['growth']['users_growth'] }}%</div>
            </div>
            <div class="info-row">
                <div class="info-label">Revenue Growth</div>
                <div class="info-value">{{ $report['growth']['revenue_growth'] }}%</div>
            </div>
        </div>
    </div>
    @endif

    @if(isset($report['tables']['top_cities']) && count($report['tables']['top_cities']) > 0)
    <div class="section">
        <div class="section-title">Top Cities</div>
        <table>
            <thead>
                <tr>
                    <th>City</th>
                    <th>Count</th>
                </tr>
            </thead>
            <tbody>
                @foreach($report['tables']['top_cities'] as $city)
                <tr>
                    <td>{{ $city['city'] }}</td>
                    <td>{{ $city['count'] }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    @if(isset($report['tables']['top_users']) && count($report['tables']['top_users']) > 0)
    <div class="section">
        <div class="section-title">Top Users</div>
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Apartments Count</th>
                </tr>
            </thead>
            <tbody>
                @foreach($report['tables']['top_users'] as $user)
                <tr>
                    <td>{{ $user['name'] }}</td>
                    <td>{{ $user['email'] }}</td>
                    <td>{{ $user['apartments_count'] }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    @if(isset($report['ratings']))
    <div class="section">
        <div class="section-title">Ratings Statistics</div>
        <div class="info-grid">
            <div class="info-row">
                <div class="info-label">Total Reviews</div>
                <div class="info-value">{{ $report['ratings']['total_reviews'] }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Average Rating</div>
                <div class="info-value">{{ $report['ratings']['average_rating'] }} ⭐</div>
            </div>
        </div>
        @if(isset($report['ratings']['rating_distribution']))
        <table style="margin-top: 15px;">
            <thead>
                <tr>
                    <th>Rating</th>
                    <th>Count</th>
                </tr>
            </thead>
            <tbody>
                @foreach($report['ratings']['rating_distribution'] as $rating => $count)
                <tr>
                    <td>{{ $rating }} ⭐</td>
                    <td>{{ $count }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @endif
    </div>
    @endif

    @if(isset($report['tables']['booking_success_rate']))
    <div class="section">
        <div class="section-title">Booking Success Rate</div>
        <div class="info-grid">
            <div class="info-row">
                <div class="info-label">Success Rate</div>
                <div class="info-value">{{ $report['tables']['booking_success_rate'] }}%</div>
            </div>
        </div>
    </div>
    @endif
</body>
</html>

