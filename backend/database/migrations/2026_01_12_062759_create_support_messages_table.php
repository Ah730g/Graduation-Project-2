<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('support_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained('support_tickets')->onDelete('cascade');
            $table->foreignId('sender_id')->constrained('users')->onDelete('cascade');
            $table->enum('sender_type', ['user', 'admin'])->default('user');
            $table->text('message');
            $table->json('attachments')->nullable(); // Array of file URLs
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            
            $table->index(['ticket_id', 'created_at']);
            $table->index(['sender_id', 'read_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('support_messages');
    }
};
