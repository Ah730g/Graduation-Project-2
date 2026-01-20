<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class SupportTicket extends Model
{
    protected $fillable = [
        'user_id',
        'admin_id',
        'subject',
        'description',
        'category',
        'status',
        'priority',
        'closed_at',
    ];

    protected $casts = [
        'closed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(SupportMessage::class, 'ticket_id');
    }

    public function latestMessage(): HasOne
    {
        return $this->hasOne(SupportMessage::class, 'ticket_id')->orderBy('created_at', 'desc');
    }
}
