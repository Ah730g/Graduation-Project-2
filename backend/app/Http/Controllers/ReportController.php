<?php

namespace App\Http\Controllers;

use App\Services\ReportService;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Barryvdh\DomPDF\Facade\Pdf;

class ReportController extends Controller
{
    /**
     * Generate daily report
     */
    public function daily(Request $request)
    {
        $date = $request->get('date', Carbon::today()->format('Y-m-d'));
        
        try {
            $report = ReportService::generateDailyReport($date);
            return response()->json($report);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error generating daily report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate weekly report
     */
    public function weekly(Request $request)
    {
        $startDate = $request->get('start_date', Carbon::now()->startOfWeek()->format('Y-m-d'));
        
        try {
            $report = ReportService::generateWeeklyReport($startDate);
            return response()->json($report);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error generating weekly report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate monthly report
     */
    public function monthly(Request $request)
    {
        $month = $request->get('month', Carbon::now()->month);
        $year = $request->get('year', Carbon::now()->year);
        
        try {
            $report = ReportService::generateMonthlyReport($month, $year);
            return response()->json($report);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error generating monthly report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate yearly report
     */
    public function yearly(Request $request)
    {
        $year = $request->get('year', Carbon::now()->year);
        
        try {
            $report = ReportService::generateYearlyReport($year);
            return response()->json($report);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error generating yearly report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export report as PDF
     */
    public function exportPdf(Request $request)
    {
        $type = $request->get('type', 'daily');
        $date = $request->get('date', Carbon::today()->format('Y-m-d'));
        $weekStart = $request->get('start_date', Carbon::now()->startOfWeek()->format('Y-m-d'));
        $month = $request->get('month', Carbon::now()->month);
        $year = $request->get('year', Carbon::now()->year);

        try {
            $report = null;
            switch ($type) {
                case 'daily':
                    $report = ReportService::generateDailyReport($date);
                    break;
                case 'weekly':
                    $report = ReportService::generateWeeklyReport($weekStart);
                    break;
                case 'monthly':
                    $report = ReportService::generateMonthlyReport($month, $year);
                    break;
                case 'yearly':
                    $report = ReportService::generateYearlyReport($year);
                    break;
            }

            if (!$report) {
                return response()->json(['message' => 'Invalid report type'], 400);
            }

            $pdf = Pdf::loadView('reports.pdf', [
                'report' => $report,
                'type' => $type,
            ]);

            $fileName = 'report_' . $type . '_' . date('Y-m-d') . '.pdf';
            return $pdf->download($fileName);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error exporting PDF',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export report as CSV
     */
    public function exportCsv(Request $request)
    {
        $type = $request->get('type', 'daily');
        $date = $request->get('date', Carbon::today()->format('Y-m-d'));
        $weekStart = $request->get('start_date', Carbon::now()->startOfWeek()->format('Y-m-d'));
        $month = $request->get('month', Carbon::now()->month);
        $year = $request->get('year', Carbon::now()->year);

        try {
            $report = null;
            switch ($type) {
                case 'daily':
                    $report = ReportService::generateDailyReport($date);
                    break;
                case 'weekly':
                    $report = ReportService::generateWeeklyReport($weekStart);
                    break;
                case 'monthly':
                    $report = ReportService::generateMonthlyReport($month, $year);
                    break;
                case 'yearly':
                    $report = ReportService::generateYearlyReport($year);
                    break;
            }

            if (!$report) {
                return response()->json(['message' => 'Invalid report type'], 400);
            }

            $fileName = 'report_' . $type . '_' . date('Y-m-d') . '.csv';
            
            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
            ];

            $callback = function() use ($report, $type) {
                $file = fopen('php://output', 'w');
                
                // BOM for UTF-8
                fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));
                
                // Header
                fputcsv($file, ['Report Type', ucfirst($type) . ' Report']);
                fputcsv($file, ['Period', $report['period']['start_formatted'] . ' - ' . $report['period']['end_formatted']]);
                fputcsv($file, []);
                
                // Summary
                fputcsv($file, ['Summary']);
                fputcsv($file, ['Metric', 'Value']);
                fputcsv($file, ['New Users', $report['summary']['new_users']]);
                fputcsv($file, ['New Apartments', $report['summary']['new_apartments']]);
                fputcsv($file, ['New Booking Requests', $report['summary']['new_booking_requests']]);
                fputcsv($file, ['Signed Contracts', $report['summary']['signed_contracts']]);
                fputcsv($file, ['Payments Received', $report['summary']['payments_received']]);
                fputcsv($file, ['Total Revenue', $report['summary']['total_revenue']]);
                fputcsv($file, ['New Support Tickets', $report['summary']['new_support_tickets']]);
                fputcsv($file, []);

                // Growth (if available)
                if (isset($report['growth'])) {
                    fputcsv($file, ['Growth Rate']);
                    fputcsv($file, ['Users Growth', $report['growth']['users_growth'] . '%']);
                    fputcsv($file, ['Revenue Growth', $report['growth']['revenue_growth'] . '%']);
                    fputcsv($file, []);
                }

                // Top Cities (if available)
                if (isset($report['tables']['top_cities'])) {
                    fputcsv($file, ['Top Cities']);
                    fputcsv($file, ['City', 'Count']);
                    foreach ($report['tables']['top_cities'] as $city) {
                        fputcsv($file, [$city['city'], $city['count']]);
                    }
                    fputcsv($file, []);
                }

                // Top Users (if available)
                if (isset($report['tables']['top_users'])) {
                    fputcsv($file, ['Top Users']);
                    fputcsv($file, ['Name', 'Email', 'Apartments Count']);
                    foreach ($report['tables']['top_users'] as $user) {
                        fputcsv($file, [$user['name'], $user['email'], $user['apartments_count']]);
                    }
                    fputcsv($file, []);
                }

                // Ratings (if available)
                if (isset($report['ratings'])) {
                    fputcsv($file, ['Ratings Statistics']);
                    fputcsv($file, ['Total Reviews', $report['ratings']['total_reviews']]);
                    fputcsv($file, ['Average Rating', $report['ratings']['average_rating']]);
                    fputcsv($file, []);
                }

                fclose($file);
            };

            return response()->stream($callback, 200, $headers);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error exporting CSV',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
