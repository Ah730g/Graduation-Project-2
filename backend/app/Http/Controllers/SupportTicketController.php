<?php

namespace App\Http\Controllers;

use App\Models\SupportTicket;
use App\Models\SupportMessage;
use App\Models\Notification;
use Illuminate\Http\Request;

class SupportTicketController extends Controller
{
    /**
     * Get user's support tickets
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $status = $request->get('status');
        $query = SupportTicket::where('user_id', $user->id)
            ->with(['user:id,name,email,avatar', 'admin:id,name,email,avatar', 'latestMessage'])
            ->orderBy('created_at', 'desc');

        if ($status) {
            $query->where('status', $status);
        }

        $tickets = $query->paginate(15);

        return response()->json($tickets);
    }

    /**
     * Create a new support ticket
     */
    public function store(Request $request)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $request->validate([
            'subject' => 'required|string|max:255',
            'description' => 'required|string|max:5000',
            'category' => 'required|in:technical,payment,booking,other',
            'priority' => 'nullable|in:low,medium,high,urgent',
        ]);

        $ticket = SupportTicket::create([
            'user_id' => $user->id,
            'subject' => $request->subject,
            'description' => $request->description,
            'category' => $request->category,
            'priority' => $request->priority ?? 'medium',
            'status' => 'open',
        ]);

        // Create initial message with description
        SupportMessage::create([
            'ticket_id' => $ticket->id,
            'sender_id' => $user->id,
            'sender_type' => 'user',
            'message' => $request->description,
            'attachments' => [],
        ]);

        // Notify all admins about new ticket
        $admins = \App\Models\User::where('role', 'admin')->get();
        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'support_ticket_new',
                'title' => 'تذكرة دعم جديدة',
                'message' => "تذكرة جديدة من {$user->name}: {$request->subject}",
                'data' => [
                    'ticket_id' => $ticket->id,
                    'user_id' => $user->id,
                ],
            ]);
        }

        $ticket->load(['user:id,name,email,avatar', 'messages.sender:id,name,email,avatar']);

        return response()->json($ticket, 201);
    }

    /**
     * Get ticket details with messages
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $ticket = SupportTicket::where('user_id', $user->id)
            ->with(['user:id,name,email,avatar', 'admin:id,name,email,avatar', 'messages.sender:id,name,email,avatar'])
            ->findOrFail($id);

        // Mark unread messages as read
        $ticket->messages()
            ->where('sender_type', 'admin')
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json($ticket);
    }

    /**
     * Reply to a ticket
     */
    public function reply(Request $request, $id)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $ticket = SupportTicket::where('user_id', $user->id)
            ->findOrFail($id);

        if ($ticket->status === 'closed') {
            return response()->json(['message' => 'Cannot reply to closed ticket'], 403);
        }

        $request->validate([
            'message' => 'required|string|max:5000',
        ]);

        $message = SupportMessage::create([
            'ticket_id' => $ticket->id,
            'sender_id' => $user->id,
            'sender_type' => 'user',
            'message' => $request->message,
            'attachments' => [],
        ]);

        // Update ticket status if it was resolved
        if ($ticket->status === 'resolved') {
            $ticket->update(['status' => 'open']);
        }

        // Notify assigned admin
        if ($ticket->admin_id) {
            Notification::create([
                'user_id' => $ticket->admin_id,
                'type' => 'support_ticket_reply',
                'title' => 'رد جديد على التذكرة',
                'message' => "رد جديد من {$user->name} على التذكرة: {$ticket->subject}",
                'data' => [
                    'ticket_id' => $ticket->id,
                    'user_id' => $user->id,
                ],
            ]);
        } else {
            // Notify all admins if no admin assigned
            $admins = \App\Models\User::where('role', 'admin')->get();
            foreach ($admins as $admin) {
                Notification::create([
                    'user_id' => $admin->id,
                    'type' => 'support_ticket_reply',
                    'title' => 'رد جديد على التذكرة',
                    'message' => "رد جديد من {$user->name} على التذكرة: {$ticket->subject}",
                    'data' => [
                        'ticket_id' => $ticket->id,
                        'user_id' => $user->id,
                    ],
                ]);
            }
        }

        $message->load('sender:id,name,email,avatar');

        return response()->json($message, 201);
    }

    /**
     * Close a ticket
     */
    public function close(Request $request, $id)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $ticket = SupportTicket::where('user_id', $user->id)
            ->findOrFail($id);

        if ($ticket->status === 'closed') {
            return response()->json(['message' => 'Ticket is already closed'], 400);
        }

        $ticket->update([
            'status' => 'closed',
            'closed_at' => now(),
        ]);

        // Notify admin
        if ($ticket->admin_id) {
            Notification::create([
                'user_id' => $ticket->admin_id,
                'type' => 'support_ticket_closed',
                'title' => 'تم إغلاق التذكرة',
                'message' => "تم إغلاق التذكرة: {$ticket->subject}",
                'data' => [
                    'ticket_id' => $ticket->id,
                    'user_id' => $user->id,
                ],
            ]);
        }

        return response()->json(['message' => 'Ticket closed successfully']);
    }
}
