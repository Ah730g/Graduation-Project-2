<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckUserStatus
{
    /**
     * Handle an incoming request.
     * Check if the authenticated user's account is disabled
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        
        if ($user && $user->status === 'disabled') {
            // Delete all user tokens to force logout
            $user->tokens()->delete();
            
            return response()->json([
                'message' => 'Your account has been disabled. Please contact support.',
                'status' => 'disabled'
            ], 403);
        }
        
        return $next($request);
    }
}
