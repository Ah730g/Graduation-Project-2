<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        try {
            $reputation = $this->resource->getReputation();
        } catch (\Exception $e) {
            $reputation = [
                'average_rating' => 0,
                'total_reviews' => 0,
            ];
        }
        
        return [
            "id" => $this->id,
            "name" => $this->name,
            "email" => $this->email,
            "avatar" => $this->avatar,
            "role" => $this->role ?? 'user',
            "status" => $this->status ?? 'active',
            "identity_status" => $this->identity_status ?? 'none',
            "reputation" => [
                "average_rating" => $reputation['average_rating'] ?? 0,
                "total_reviews" => $reputation['total_reviews'] ?? 0,
            ],
        ];
    }
}
