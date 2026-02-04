<?php

namespace App\Http\Controllers;

use App\Http\Resources\PostResource;
use App\Http\Resources\UserResource;
use App\Models\user;
use App\Http\Requests\StoreuserRequest;
use App\Http\Requests\UpdateuserRequest;
use App\Models\Post;

class userController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreuserRequest $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(user $user)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateuserRequest $request, user $user)
    {
        $data = $request->validated();
        
        // Only update password if it's provided and not empty
        if(isset($data['password']) && !empty($data['password'])) {
            $data["password"] = bcrypt($data["password"]);
        } else {
            // Remove password fields if empty to keep current password
            unset($data['password']);
            unset($data['password_confirmation']);
        }
        
        $user->update($data);
        return response(new UserResource($user),201);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(user $user)
    {
        //
    }
    public function getUserPosts($id)
    {
        try {
            // Convert to integer to ensure type matching
            $userId = (int) $id;
            
            // Log for debugging
            \Log::info('getUserPosts called', [
                'requested_user_id' => $id,
                'converted_user_id' => $userId,
                'type' => gettype($userId)
            ]);
            
            // Check if user exists
            $userExists = \App\Models\User::where('id', $userId)->exists();
            \Log::info('User exists check', [
                'user_id' => $userId,
                'exists' => $userExists
            ]);
            
            // Try querying with both string and integer to see if that's the issue
            $postsByInt = Post::where("user_id", $userId)->count();
            $postsByString = Post::where("user_id", (string)$userId)->count();
            
            \Log::info('Post count by type', [
                'by_int' => $postsByInt,
                'by_string' => $postsByString
            ]);
            
            // Get all posts for this user (including drafts) - try both ways
            $posts = Post::with(['postimage', 'porperty', 'durationPrices'])
                ->where("user_id", $userId)
                ->get();
            
            // If no posts found, try with string
            if ($posts->isEmpty()) {
                $posts = Post::with(['postimage', 'porperty', 'durationPrices'])
                    ->where("user_id", (string)$userId)
                    ->get();
            }
            
            // Also check total posts count
            $totalPosts = Post::where("user_id", $userId)->count();
            
            // Log for debugging
            \Log::info('getUserPosts results', [
                'user_id' => $userId,
                'posts_count' => $posts->count(),
                'total_posts_in_db' => $totalPosts,
                'post_ids' => $posts->pluck('id')->toArray(),
                'post_titles' => $posts->pluck('Title')->toArray(),
                'post_user_ids' => $posts->pluck('user_id')->unique()->toArray()
            ]);
            
            // Check if there are any posts at all in the database
            $allPostsCount = Post::count();
            $allUserIds = Post::select('user_id')->distinct()->pluck('user_id')->toArray();
            \Log::info('Total posts in database', [
                'count' => $allPostsCount,
                'unique_user_ids' => $allUserIds
            ]);
            
            return PostResource::collection($posts);
        } catch (\Exception $e) {
            \Log::error('Error in getUserPosts', [
                'user_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to fetch posts',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
