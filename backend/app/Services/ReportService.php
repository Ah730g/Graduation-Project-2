<?php

namespace App\Services;

use App\Models\User;
use App\Models\Post;
use App\Models\RentalRequest;
use App\Models\Contract;
use App\Models\Payment;
use App\Models\SupportTicket;
use App\Models\Review;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReportService
{
    /**
     * Generate daily report
     */
    public static function generateDailyReport($date = null)
    {
        $date = $date ? Carbon::parse($date) : Carbon::today();
        $startDate = $date->copy()->startOfDay();
        $endDate = $date->copy()->endOfDay();

        return self::generateReport($startDate, $endDate, 'daily');
    }

    /**
     * Generate weekly report
     */
    public static function generateWeeklyReport($startDate = null)
    {
        $startDate = $startDate ? Carbon::parse($startDate) : Carbon::now()->startOfWeek();
        $endDate = $startDate->copy()->endOfWeek();

        return self::generateReport($startDate, $endDate, 'weekly');
    }

    /**
     * Generate monthly report
     */
    public static function generateMonthlyReport($month = null, $year = null)
    {
        $month = $month ?? Carbon::now()->month;
        $year = $year ?? Carbon::now()->year;
        
        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        return self::generateReport($startDate, $endDate, 'monthly');
    }

    /**
     * Generate yearly report
     */
    public static function generateYearlyReport($year = null)
    {
        $year = $year ?? Carbon::now()->year;
        
        $startDate = Carbon::create($year, 1, 1)->startOfYear();
        $endDate = $startDate->copy()->endOfYear();

        return self::generateReport($startDate, $endDate, 'yearly');
    }

    /**
     * Generate report data
     */
    private static function generateReport($startDate, $endDate, $type)
    {
        // Basic statistics
        $newUsers = User::whereBetween('created_at', [$startDate, $endDate])->count();
        $newApartments = Post::whereBetween('created_at', [$startDate, $endDate])->count();
        $newBookingRequests = RentalRequest::whereBetween('created_at', [$startDate, $endDate])->count();
        $signedContracts = Contract::whereBetween('created_at', [$startDate, $endDate])
            ->whereIn('status', ['signed', 'active'])->count();
        $paymentsReceived = Payment::whereBetween('created_at', [$startDate, $endDate])
            ->where('status', 'confirmed')->count();
        $totalRevenue = Payment::whereBetween('created_at', [$startDate, $endDate])
            ->where('status', 'confirmed')->sum('amount');
        $newSupportTickets = SupportTicket::whereBetween('created_at', [$startDate, $endDate])->count();

        $report = [
            'type' => $type,
            'period' => [
                'start' => $startDate->toDateTimeString(),
                'end' => $endDate->toDateTimeString(),
                'start_formatted' => $startDate->format('Y-m-d'),
                'end_formatted' => $endDate->format('Y-m-d'),
            ],
            'summary' => [
                'new_users' => $newUsers,
                'new_apartments' => $newApartments,
                'new_booking_requests' => $newBookingRequests,
                'signed_contracts' => $signedContracts,
                'payments_received' => $paymentsReceived,
                'total_revenue' => $totalRevenue,
                'new_support_tickets' => $newSupportTickets,
            ],
        ];

        // Additional data for weekly, monthly, and yearly reports
        if (in_array($type, ['weekly', 'monthly', 'yearly'])) {
            $report['charts'] = self::generateCharts($startDate, $endDate, $type);
            $report['tables'] = self::generateTables($startDate, $endDate);
        }

        // Additional data for monthly and yearly reports
        if (in_array($type, ['monthly', 'yearly'])) {
            $report['growth'] = self::calculateGrowth($startDate, $endDate, $type);
            $report['ratings'] = self::getRatingsStats($startDate, $endDate);
        }

        return $report;
    }

    /**
     * Generate charts data
     */
    private static function generateCharts($startDate, $endDate, $type)
    {
        $charts = [];

        // Users growth chart
        if ($type === 'weekly') {
            $charts['users_growth'] = self::getDailyData(User::class, $startDate, $endDate, 'users');
        } elseif ($type === 'monthly') {
            $charts['users_growth'] = self::getWeeklyData(User::class, $startDate, $endDate, 'users');
        } else {
            $charts['users_growth'] = self::getMonthlyData(User::class, $startDate, $endDate, 'users');
        }

        // Revenue trend
        if ($type === 'weekly') {
            $charts['revenue_trend'] = self::getDailyRevenueData($startDate, $endDate);
        } elseif ($type === 'monthly') {
            $charts['revenue_trend'] = self::getWeeklyRevenueData($startDate, $endDate);
        } else {
            $charts['revenue_trend'] = self::getMonthlyRevenueData($startDate, $endDate);
        }

        // Apartments by type
        $charts['apartments_by_type'] = Post::whereBetween('created_at', [$startDate, $endDate])
            ->select('type', DB::raw('count(*) as count'))
            ->groupBy('type')
            ->get()
            ->map(function ($item) {
                return [
                    'name' => $item->type ?? 'Unknown',
                    'value' => $item->count,
                ];
            });

        // Booking requests by status
        $charts['booking_requests_by_status'] = RentalRequest::whereBetween('created_at', [$startDate, $endDate])
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->map(function ($item) {
                return [
                    'name' => $item->status,
                    'value' => $item->count,
                ];
            });

        return $charts;
    }

    /**
     * Generate tables data
     */
    private static function generateTables($startDate, $endDate)
    {
        // Top cities by apartments
        $topCities = Post::whereBetween('created_at', [$startDate, $endDate])
            ->select('city', DB::raw('count(*) as count'))
            ->groupBy('city')
            ->orderBy('count', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($item) {
                return [
                    'city' => $item->city ?? 'Unknown',
                    'count' => $item->count,
                ];
            });

        // Top users by activity
        $topUsers = User::whereHas('post', function ($query) use ($startDate, $endDate) {
            $query->whereBetween('created_at', [$startDate, $endDate]);
        })
            ->withCount(['post' => function ($query) use ($startDate, $endDate) {
                $query->whereBetween('created_at', [$startDate, $endDate]);
            }])
            ->orderBy('post_count', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'apartments_count' => $user->post_count,
                ];
            });

        // Booking success rate
        $totalRequests = RentalRequest::whereBetween('created_at', [$startDate, $endDate])->count();
        $approvedRequests = RentalRequest::whereBetween('created_at', [$startDate, $endDate])
            ->whereIn('status', ['approved', 'payment_received', 'payment_confirmed', 'contract_signing', 'contract_signed'])
            ->count();
        $successRate = $totalRequests > 0 ? round(($approvedRequests / $totalRequests) * 100, 2) : 0;

        return [
            'top_cities' => $topCities,
            'top_users' => $topUsers,
            'booking_success_rate' => $successRate,
        ];
    }

    /**
     * Calculate growth rate
     */
    private static function calculateGrowth($startDate, $endDate, $type)
    {
        if ($type === 'monthly') {
            $previousStart = $startDate->copy()->subMonth()->startOfMonth();
            $previousEnd = $previousStart->copy()->endOfMonth();
        } else {
            $previousStart = $startDate->copy()->subYear()->startOfYear();
            $previousEnd = $previousStart->copy()->endOfYear();
        }

        $currentUsers = User::whereBetween('created_at', [$startDate, $endDate])->count();
        $previousUsers = User::whereBetween('created_at', [$previousStart, $previousEnd])->count();
        $usersGrowth = $previousUsers > 0 ? round((($currentUsers - $previousUsers) / $previousUsers) * 100, 2) : 0;

        $currentRevenue = Payment::whereBetween('created_at', [$startDate, $endDate])
            ->where('status', 'confirmed')->sum('amount');
        $previousRevenue = Payment::whereBetween('created_at', [$previousStart, $previousEnd])
            ->where('status', 'confirmed')->sum('amount');
        $revenueGrowth = $previousRevenue > 0 ? round((($currentRevenue - $previousRevenue) / $previousRevenue) * 100, 2) : 0;

        return [
            'users_growth' => $usersGrowth,
            'revenue_growth' => $revenueGrowth,
        ];
    }

    /**
     * Get ratings statistics
     */
    private static function getRatingsStats($startDate, $endDate)
    {
        $reviews = Review::whereBetween('created_at', [$startDate, $endDate])
            ->where('status', 'revealed')
            ->get();

        return [
            'total_reviews' => $reviews->count(),
            'average_rating' => $reviews->count() > 0 ? round($reviews->avg('rating'), 2) : 0,
            'rating_distribution' => [
                '5' => $reviews->where('rating', 5)->count(),
                '4' => $reviews->where('rating', 4)->count(),
                '3' => $reviews->where('rating', 3)->count(),
                '2' => $reviews->where('rating', 2)->count(),
                '1' => $reviews->where('rating', 1)->count(),
            ],
        ];
    }

    /**
     * Get daily data for charts
     */
    private static function getDailyData($model, $startDate, $endDate, $label)
    {
        $data = [];
        $current = $startDate->copy();
        
        while ($current <= $endDate) {
            $count = $model::whereDate('created_at', $current->format('Y-m-d'))->count();
            $data[] = [
                'date' => $current->format('Y-m-d'),
                'label' => $current->format('M d'),
                'value' => $count,
            ];
            $current->addDay();
        }
        
        return $data;
    }

    /**
     * Get weekly data for charts
     */
    private static function getWeeklyData($model, $startDate, $endDate, $label)
    {
        $data = [];
        $current = $startDate->copy();
        
        while ($current <= $endDate) {
            $weekEnd = $current->copy()->endOfWeek();
            if ($weekEnd > $endDate) {
                $weekEnd = $endDate;
            }
            
            $count = $model::whereBetween('created_at', [$current, $weekEnd])->count();
            $data[] = [
                'date' => $current->format('Y-m-d'),
                'label' => 'Week ' . $current->format('M d'),
                'value' => $count,
            ];
            $current->addWeek();
        }
        
        return $data;
    }

    /**
     * Get monthly data for charts
     */
    private static function getMonthlyData($model, $startDate, $endDate, $label)
    {
        $data = [];
        $current = $startDate->copy();
        
        while ($current <= $endDate) {
            $monthEnd = $current->copy()->endOfMonth();
            if ($monthEnd > $endDate) {
                $monthEnd = $endDate;
            }
            
            $count = $model::whereBetween('created_at', [$current, $monthEnd])->count();
            $data[] = [
                'date' => $current->format('Y-m'),
                'label' => $current->format('M Y'),
                'value' => $count,
            ];
            $current->addMonth();
        }
        
        return $data;
    }

    /**
     * Get daily revenue data
     */
    private static function getDailyRevenueData($startDate, $endDate)
    {
        $data = [];
        $current = $startDate->copy();
        
        while ($current <= $endDate) {
            $revenue = Payment::whereDate('created_at', $current->format('Y-m-d'))
                ->where('status', 'confirmed')
                ->sum('amount');
            $data[] = [
                'date' => $current->format('Y-m-d'),
                'label' => $current->format('M d'),
                'value' => $revenue,
            ];
            $current->addDay();
        }
        
        return $data;
    }

    /**
     * Get weekly revenue data
     */
    private static function getWeeklyRevenueData($startDate, $endDate)
    {
        $data = [];
        $current = $startDate->copy();
        
        while ($current <= $endDate) {
            $weekEnd = $current->copy()->endOfWeek();
            if ($weekEnd > $endDate) {
                $weekEnd = $endDate;
            }
            
            $revenue = Payment::whereBetween('created_at', [$current, $weekEnd])
                ->where('status', 'confirmed')
                ->sum('amount');
            $data[] = [
                'date' => $current->format('Y-m-d'),
                'label' => 'Week ' . $current->format('M d'),
                'value' => $revenue,
            ];
            $current->addWeek();
        }
        
        return $data;
    }

    /**
     * Get monthly revenue data
     */
    private static function getMonthlyRevenueData($startDate, $endDate)
    {
        $data = [];
        $current = $startDate->copy();
        
        while ($current <= $endDate) {
            $monthEnd = $current->copy()->endOfMonth();
            if ($monthEnd > $endDate) {
                $monthEnd = $endDate;
            }
            
            $revenue = Payment::whereBetween('created_at', [$current, $monthEnd])
                ->where('status', 'confirmed')
                ->sum('amount');
            $data[] = [
                'date' => $current->format('Y-m'),
                'label' => $current->format('M Y'),
                'value' => $revenue,
            ];
            $current->addMonth();
        }
        
        return $data;
    }
}

