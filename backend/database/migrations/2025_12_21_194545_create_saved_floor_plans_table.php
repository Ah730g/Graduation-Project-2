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
        Schema::create('saved_floor_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('title')->nullable();
            $table->string('property_type')->default('apartment');
            $table->decimal('total_area_m2', 10, 2)->nullable();
            $table->string('orientation')->default('north');
            $table->longText('layout_data'); // JSON data for the layout
            $table->text('description')->nullable(); // Original description
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('saved_floor_plans');
    }
};
