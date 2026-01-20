<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SavedFloorPlan extends Model
{
    protected $fillable = [
        'user_id',
        'title',
        'property_type',
        'total_area_m2',
        'orientation',
        'layout_data',
        'description',
        'room_heights',
        'wall_materials',
        'floor_materials',
        'ceiling_height',
        'view_3d_settings',
    ];

    protected $casts = [
        'layout_data' => 'array',
        'total_area_m2' => 'decimal:2',
        'room_heights' => 'array',
        'wall_materials' => 'array',
        'floor_materials' => 'array',
        'ceiling_height' => 'decimal:2',
        'view_3d_settings' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
