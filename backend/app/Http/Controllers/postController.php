<?php

namespace App\Http\Controllers;

use App\Http\Resources\PostDetailsResource;
use App\Models\post;
use App\Http\Requests\StorepostRequest;
use App\Http\Requests\UpdatepostRequest;
use App\Http\Resources\PostResource;
use App\Models\PostImage;
use App\Models\Porperty;
use App\Models\PostDurationPrice;
use Illuminate\Http\Request;

class postController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Post::query();

        // Exclude draft and rented posts from public listings
        $query->where("status", "!=", "draft")
              ->where("status", "!=", "rented")
              // Also exclude posts with active/scheduled contracts (exclude expired ones)
              ->whereDoesntHave('contracts', function($q) {
                  $q->whereIn('status', ['active', 'signed', 'pending_signing', 'pending'])
                    ->where('end_date', '>=', now()->format('Y-m-d'))
                    ->where('status', '!=', 'expired');
              })
              // Also exclude posts with approved or in-progress rental requests
              ->whereDoesntHave('rentalRequests', function($q) {
                  $q->whereIn('status', [
                      'approved', 
                      'awaiting_payment', 
                      'payment_received', 
                      'payment_confirmed', 
                      'contract_signing',
                      'contract_signed'
                  ])
                  ->whereDoesntHave('contract', function($subQ) {
                      $subQ->where('status', 'cancelled');
                  });
              });

        if($request->has("location") && !empty($request->location))
            $query->where("City",$request->location);

        if($request->has("min") && !empty($request->min))
            $query->where("Price",">=",$request->min);

        if($request->has("max") && !empty($request->max))
            $query->where("Price","<=",$request->max);

        if($request->has("type") && !empty($request->type))
            $query->where("Type","=",$request->type);

        if($request->has("property") && !empty($request->property))
            $query->where("porperty_id",$request->property);

        if($request->has("bedroom") && !empty($request->bedroom))
            $query->where("Bedrooms","=",$request->bedroom);

        $posts = $query->with('durationPrices')->get();
        return PostResource::collection($posts);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StorepostRequest $request)
    {
        // Get authenticated user
        $user = $request->user();
        
        // Security check: Ensure user is authenticated
        if (!$user) {
            return response()->json([
                'message' => 'Unauthorized. Please log in to create posts.',
            ], 401);
        }
        
        // Determine if this is a draft save
        $isDraft = $request->input('is_draft', false);
        
        // For drafts, check if at least 4 fields are filled
        if ($isDraft) {
            $filledFields = 0;
            $fieldsToCheck = [
                'title', 'price', 'address', 'description', 'city',
                'bedrooms', 'bathrooms', 'latitude', 'longitude', 'type',
                'porperty_id', 'utilities_policy', 'income_policy', 'total_size',
                'bus', 'resturant', 'school'
            ];
            
            foreach ($fieldsToCheck as $field) {
                $value = $request->input($field);
                if ($value !== null && $value !== '' && $value !== 0) {
                    $filledFields++;
                }
            }
            
            // Check images
            if ($request->has('images') && is_array($request->input('images')) && count($request->input('images')) > 0) {
                $filledFields++;
            }
            
            // Check floor plan
            if ($request->has('floor_plan_data') && !empty($request->floor_plan_data)) {
                $filledFields++;
            }
            
            if ($filledFields < 4) {
                return response()->json([
                    'message' => 'Please fill at least 4 fields to save as draft.',
                ], 422);
            }
        }
        
        // For drafts, skip identity verification check
        // For published posts, check identity verification status
        if (!$isDraft && $user->identity_status !== 'approved') {
            return response()->json([
                'message' => 'Identity verification required. Please submit your identity documents for verification before creating posts.',
                'identity_status' => $user->identity_status ?? 'none',
            ], 403);
        }

        $data = $request->validated();
        
        // For drafts, use default values for required fields that are not filled
        // Get default property if not provided
        $defaultPropertyId = $request->porperty_id;
        if (!$defaultPropertyId) {
            $firstProperty = Porperty::first();
            $defaultPropertyId = $firstProperty ? $firstProperty->id : 1;
        }
        
        $postData = [
            'user_id' => $user->id,
            'status' => $isDraft ? 'draft' : 'pending',
            'Title' => $request->title ?? 'Draft',
            'Price' => $request->price ?? 0,
            'Address' => $request->address ?? 'Not specified',
            'Description' => $request->description ?? 'Draft post',
            'City' => $request->city ?? 'Not specified',
            'Bedrooms' => $request->bedrooms ?? 0,
            'Bathrooms' => $request->bathrooms ?? 0,
            'Latitude' => $request->latitude ?? '0',
            'Longitude' => $request->longitude ?? '0',
            'Type' => $request->type ?? 'rent',
            'porperty_id' => $defaultPropertyId,
            'Utilities_Policy' => $request->utilities_policy ?? 'owner',
            'Pet_Policy' => $request->has('pet_policy') ? (bool)$request->pet_policy : false,
            'Income_Policy' => $request->income_policy ?? 'Not specified',
            'Total_Size' => $request->total_size ?? 0,
            'Bus' => $request->bus ?? 0,
            'Resturant' => $request->resturant ?? 0,
            'School' => $request->school ?? 0,
            'floor_plan_data' => $request->floor_plan_data ?? null,
            'floor_number' => $request->floor_number ?? null,
            'has_elevator' => $request->has('has_elevator') ? (bool)$request->has_elevator : null,
            'floor_condition' => $request->floor_condition ?? null,
            'has_internet' => $request->has('has_internet') ? (bool)$request->has_internet : null,
            'has_electricity' => $request->has('has_electricity') ? (bool)$request->has_electricity : null,
            'has_air_conditioning' => $request->has('has_air_conditioning') ? (bool)$request->has_air_conditioning : null,
            'building_condition' => $request->building_condition ?? null,
        ];
        
        $post = Post::create($postData);

        if (!empty($request["images"]) && is_array($request["images"])) {
            $images = collect($request["images"])->map(function($url) use ($post) {
                return [
                    "Image_URL" => $url,
                    "post_id" => $post->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            })->toArray();
            PostImage::insert($images);
        }

        // Handle duration prices if provided
        if ($request->has('duration_prices') && is_array($request->duration_prices)) {
            foreach ($request->duration_prices as $durationPrice) {
                if (isset($durationPrice['duration_type']) && isset($durationPrice['price'])) {
                    PostDurationPrice::updateOrCreate(
                        [
                            'post_id' => $post->id,
                            'duration_type' => $durationPrice['duration_type'],
                        ],
                        [
                            'price' => $durationPrice['price'],
                        ]
                    );
                }
            }
        }

        $post = $post->fresh()->load(['postimage', 'durationPrices']);

        return response(new PostResource($post),201);
    }

    /**
     * Display the specified resource.
     */
    public function show(post $post)
    {
        $post = Post::where("id","=",$post->id)->with('durationPrices')->firstOrFail();
        return response()->json(new PostDetailsResource($post),200);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdatepostRequest $request, post $post)
    {
        // Get authenticated user
        $user = $request->user();
        
        // Security check: Ensure user is authenticated
        if (!$user) {
            return response()->json([
                'message' => 'Unauthorized. Please log in to update posts.',
            ], 401);
        }
        
        // Check if user owns the post
        if ($post->user_id !== $user->id && $user->role !== 'admin') {
            return response()->json([
                'message' => 'You can only update your own posts.',
            ], 403);
        }
        
        // Determine if this is a draft save
        $isDraft = $request->input('is_draft', false);
        
        // For drafts, check if at least 4 fields are filled
        if ($isDraft) {
            $filledFields = 0;
            $fieldsToCheck = [
                'title', 'price', 'address', 'description', 'city',
                'bedrooms', 'bathrooms', 'latitude', 'longitude', 'type',
                'porperty_id', 'utilities_policy', 'income_policy', 'total_size',
                'bus', 'resturant', 'school'
            ];
            
            foreach ($fieldsToCheck as $field) {
                $value = $request->input($field);
                if ($value !== null && $value !== '' && $value !== 0) {
                    $filledFields++;
                }
            }
            
            // Check images
            if ($request->has('images') && is_array($request->input('images')) && count($request->input('images')) > 0) {
                $filledFields++;
            }
            
            if ($filledFields < 4) {
                return response()->json([
                    'message' => 'Please fill at least 4 fields to save as draft.',
                ], 422);
            }
        }
        
        // For published posts, check identity verification status (if changing from draft)
        if (!$isDraft && $post->status === 'draft' && $user->identity_status !== 'approved') {
            return response()->json([
                'message' => 'Identity verification required. Please submit your identity documents for verification before publishing posts.',
                'identity_status' => $user->identity_status ?? 'none',
            ], 403);
        }
        
        $data = $request->validated();
        
        // Get default property if not provided
        $defaultPropertyId = $request->porperty_id ?? $post->porperty_id;
        if (!$defaultPropertyId) {
            $firstProperty = Porperty::first();
            $defaultPropertyId = $firstProperty ? $firstProperty->id : 1;
        }
        
        // Update post data
        $updateData = [
            'Title' => $request->title ?? $post->Title,
            'Price' => $request->price ?? $post->Price,
            'Address' => $request->address ?? $post->Address,
            'Description' => $request->description ?? $post->Description,
            'City' => $request->city ?? $post->City,
            'Bedrooms' => $request->bedrooms ?? $post->Bedrooms,
            'Bathrooms' => $request->bathrooms ?? $post->Bathrooms,
            'Latitude' => $request->latitude ?? $post->Latitude,
            'Longitude' => $request->longitude ?? $post->Longitude,
            'Type' => $request->type ?? $post->Type,
            'porperty_id' => $defaultPropertyId,
            'Utilities_Policy' => $request->utilities_policy ?? $post->Utilities_Policy,
            'Pet_Policy' => $request->has('pet_policy') ? (bool)$request->pet_policy : $post->Pet_Policy,
            'Income_Policy' => $request->income_policy ?? $post->Income_Policy,
            'Total_Size' => $request->total_size ?? $post->Total_Size,
            'Bus' => $request->bus ?? $post->Bus,
            'Resturant' => $request->resturant ?? $post->Resturant,
            'School' => $request->school ?? $post->School,
            'floor_number' => $request->has('floor_number') ? $request->floor_number : $post->floor_number,
            'has_elevator' => $request->has('has_elevator') ? (bool)$request->has_elevator : $post->has_elevator,
            'floor_condition' => $request->has('floor_condition') ? $request->floor_condition : $post->floor_condition,
            'has_internet' => $request->has('has_internet') ? (bool)$request->has_internet : $post->has_internet,
            'has_electricity' => $request->has('has_electricity') ? (bool)$request->has_electricity : $post->has_electricity,
            'has_air_conditioning' => $request->has('has_air_conditioning') ? (bool)$request->has_air_conditioning : $post->has_air_conditioning,
            'building_condition' => $request->has('building_condition') ? $request->building_condition : $post->building_condition,
        ];
        
        // Handle floor_plan_data - only update if provided
        if ($request->has('floor_plan_data')) {
            $updateData['floor_plan_data'] = $request->floor_plan_data;
        }
        
        // Update status
        $updateData['status'] = $isDraft ? 'draft' : ($post->status === 'draft' ? 'pending' : $post->status);
        
        $post->update($updateData);
        
        // Update images if provided
        if ($request->has('images') && is_array($request->input('images'))) {
            // Delete old images
            PostImage::where('post_id', $post->id)->delete();
            
            // Insert new images
            $images = collect($request->input('images'))->map(function($url) use ($post) {
                return [
                    "Image_URL" => $url,
                    "post_id" => $post->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            })->toArray();
            
            if (!empty($images)) {
                PostImage::insert($images);
            }
        }
        
        // Handle duration prices if provided
        if ($request->has('duration_prices') && is_array($request->duration_prices)) {
            // Delete existing duration prices not in the new list
            $newDurationTypes = collect($request->duration_prices)->pluck('duration_type')->toArray();
            PostDurationPrice::where('post_id', $post->id)
                ->whereNotIn('duration_type', $newDurationTypes)
                ->delete();
            
            // Update or create duration prices
            foreach ($request->duration_prices as $durationPrice) {
                if (isset($durationPrice['duration_type']) && isset($durationPrice['price'])) {
                    PostDurationPrice::updateOrCreate(
                        [
                            'post_id' => $post->id,
                            'duration_type' => $durationPrice['duration_type'],
                        ],
                        [
                            'price' => $durationPrice['price'],
                        ]
                    );
                }
            }
        }
        
        $post = $post->fresh()->load(['postimage', 'durationPrices']);
        
        return response(new PostResource($post), 200);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, post $post)
    {
        $user = $request->user();
        
        // Security check: Only the owner or admin can delete
        if (!$user) {
            return response()->json([
                'message' => 'Unauthorized.',
            ], 401);
        }
        
        // Check if user owns the post or is admin
        if ($post->user_id !== $user->id && $user->role !== 'admin') {
            return response()->json([
                'message' => 'You can only delete your own posts.',
            ], 403);
        }
        
        // Delete associated images first
        PostImage::where('post_id', $post->id)->delete();
        
        // Delete the post
        $post->delete();
        
        return response()->json([
            'message' => 'Post deleted successfully.',
        ], 200);
    }



}
