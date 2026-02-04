<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Post extends Model
{
    protected $guarded = [];
    protected $fillable = [
        'user_id',
        'Title',
        'Price',
        'Address',
        'Description',
        'City',
        'Bedrooms',
        'Bathrooms',
        'Latitude',
        'Longitude',
        'Type',
        'porperty_id',
        'Utilities_Policy',
        'Pet_Policy',
        'Income_Policy',
        'Total_Size',
        'Bus',
        'Resturant',
        'School',
        'status',
        'floor_plan_data',
        'floor_number',
        'has_elevator',
        'floor_condition',
        'has_internet',
        'has_electricity',
        'has_air_conditioning',
        'building_condition',
    ];
    public function user() : BelongsTo
    {
        return $this->belongsTo(User::class);
    }
    public function porperty() : BelongsTo
    {
        return $this->belongsTo(Porperty::class);
    }
    public function postimage() : HasMany
    {
        return $this->hasMany(PostImage::class);
    }
    public function rentalRequests() : HasMany
    {
        return $this->hasMany(RentalRequest::class);
    }
    public function contracts() : HasMany
    {
        return $this->hasMany(Contract::class);
    }
    public function reviews() : HasMany
    {
        return $this->hasMany(Review::class);
    }
    
    public function payments() : HasMany
    {
        return $this->hasMany(Payment::class);
    }
    
    public function durationPrices() : HasMany
    {
        return $this->hasMany(PostDurationPrice::class);
    }
}
