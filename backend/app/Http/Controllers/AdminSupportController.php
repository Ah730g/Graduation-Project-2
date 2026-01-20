<?php

namespace App\Http\Controllers;

use App\Models\SupportTicket;
use App\Models\SupportMessage;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\Request;

class AdminSupportController extends Controller
{
    /**
     * Get all support tickets with filters
     */
    public function index(Request $request)
    {
        $perPage = $request->get('per_page', 15);
        $status = $request->get('status');
        $category = $request->get('category');
        $priority = $request->get('priority');
        $search = $request->get('search', '');

        $query = SupportTicket::with(['user:id,name,email,avatar', 'admin:id,name,email,avatar', 'latestMessage']);

        if ($status) {
            $query->where('status', $status);
        }

        if ($category) {
            $query->where('category', $category);
        }

        if ($priority) {
            $query->where('priority', $priority);
        }

        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('subject', 'LIKE', "%{$search}%")
                  ->orWhere('description', 'LIKE', "%{$search}%")
                  ->orWhereHas('user', function($q) use ($search) {
                      $q->where('name', 'LIKE', "%{$search}%")
                        ->orWhere('email', 'LIKE', "%{$search}%");
                  });
            });
        }

        $tickets = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json($tickets);
    }

    /**
     * Get support ticket statistics
     */
    public function stats()
    {
        $stats = [
            'total' => SupportTicket::count(),
            'open' => SupportTicket::where('status', 'open')->count(),
            'in_progress' => SupportTicket::where('status', 'in_progress')->count(),
            'resolved' => SupportTicket::where('status', 'resolved')->count(),
            'closed' => SupportTicket::where('status', 'closed')->count(),
            'urgent' => SupportTicket::where('priority', 'urgent')->whereIn('status', ['open', 'in_progress'])->count(),
            'high_priority' => SupportTicket::where('priority', 'high')->whereIn('status', ['open', 'in_progress'])->count(),
            'unassigned' => SupportTicket::whereNull('admin_id')->whereIn('status', ['open', 'in_progress'])->count(),
        ];

        return response()->json($stats);
    }

    /**
     * Get ticket details with messages
     */
    public function show($id)
    {
        $ticket = SupportTicket::with([
            'user:id,name,email,avatar,phone',
            'admin:id,name,email,avatar',
            'messages.sender:id,name,email,avatar'
        ])->findOrFail($id);

        // Mark unread messages as read for admin
        $ticket->messages()
            ->where('sender_type', 'user')
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json($ticket);
    }

    /**
     * Assign ticket to admin
     */
    public function assign(Request $request, $id)
    {
        $admin = $request->user();
        
        if (!$admin || $admin->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $ticket = SupportTicket::findOrFail($id);

        $ticket->update([
            'admin_id' => $admin->id,
            'status' => $ticket->status === 'open' ? 'in_progress' : $ticket->status,
        ]);

        // Notify user
        Notification::create([
            'user_id' => $ticket->user_id,
            'type' => 'support_ticket_assigned',
            'title' => 'تم تعيين تذكرة الدعم',
            'message' => "تم تعيين تذكرة الدعم الخاصة بك إلى مدير: {$admin->name}",
            'data' => [
                'ticket_id' => $ticket->id,
                'admin_id' => $admin->id,
            ],
        ]);

        $ticket->load(['user:id,name,email,avatar', 'admin:id,name,email,avatar']);

        return response()->json($ticket);
    }

    /**
     * Admin reply to ticket
     */
    public function reply(Request $request, $id)
    {
        $admin = $request->user();
        
        if (!$admin || $admin->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $ticket = SupportTicket::findOrFail($id);

        // Auto-assign if not assigned
        if (!$ticket->admin_id) {
            $ticket->update(['admin_id' => $admin->id]);
        }

        // Only assigned admin can reply
        if ($ticket->admin_id !== $admin->id) {
            return response()->json(['message' => 'You are not assigned to this ticket'], 403);
        }

        $request->validate([
            'message' => 'required|string|max:5000',
        ]);

        $message = SupportMessage::create([
            'ticket_id' => $ticket->id,
            'sender_id' => $admin->id,
            'sender_type' => 'admin',
            'message' => $request->message,
            'attachments' => [],
        ]);

        // Update ticket status
        if ($ticket->status === 'open') {
            $ticket->update(['status' => 'in_progress']);
        }

        // Notify user
        Notification::create([
            'user_id' => $ticket->user_id,
            'type' => 'support_ticket_reply',
            'title' => 'رد من الدعم الفني',
            'message' => "رد جديد من الدعم الفني على تذكرتك: {$ticket->subject}",
            'data' => [
                'ticket_id' => $ticket->id,
                'admin_id' => $admin->id,
            ],
        ]);

        $message->load('sender:id,name,email,avatar');

        return response()->json($message, 201);
    }

    /**
     * Update ticket status
     */
    public function updateStatus(Request $request, $id)
    {
        $admin = $request->user();
        
        if (!$admin || $admin->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $ticket = SupportTicket::findOrFail($id);

        $request->validate([
            'status' => 'required|in:open,in_progress,resolved,closed',
        ]);

        $oldStatus = $ticket->status;
        $ticket->update([
            'status' => $request->status,
            'closed_at' => $request->status === 'closed' ? now() : null,
        ]);

        // Notify user if status changed
        if ($oldStatus !== $request->status) {
            $statusMessages = [
                'open' => 'تم فتح التذكرة',
                'in_progress' => 'قيد المعالجة',
                'resolved' => 'تم حل المشكلة',
                'closed' => 'تم إغلاق التذكرة',
            ];

            Notification::create([
                'user_id' => $ticket->user_id,
                'type' => 'support_ticket_status_change',
                'title' => 'تغيير حالة التذكرة',
                'message' => "تم تغيير حالة تذكرتك إلى: {$statusMessages[$request->status]}",
                'data' => [
                    'ticket_id' => $ticket->id,
                    'old_status' => $oldStatus,
                    'new_status' => $request->status,
                ],
            ]);
        }

        $ticket->load(['user:id,name,email,avatar', 'admin:id,name,email,avatar']);

        return response()->json($ticket);
    }

    /**
     * Update ticket priority
     */
    public function updatePriority(Request $request, $id)
    {
        $admin = $request->user();
        
        if (!$admin || $admin->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $ticket = SupportTicket::findOrFail($id);

        $request->validate([
            'priority' => 'required|in:low,medium,high,urgent',
        ]);

        $ticket->update(['priority' => $request->priority]);

        return response()->json($ticket);
    }
}
