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
        Schema::table('posts', function (Blueprint $table) {
            $table->integer('floor_number')->nullable()->after('School');
            $table->boolean('has_elevator')->nullable()->after('floor_number');
            $table->string('floor_condition')->nullable()->after('has_elevator');
            $table->boolean('has_internet')->nullable()->after('floor_condition');
            $table->boolean('has_electricity')->nullable()->after('has_internet');
            $table->boolean('has_air_conditioning')->nullable()->after('has_electricity');
            $table->string('building_condition')->nullable()->after('has_air_conditioning');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropColumn([
                'floor_number',
                'has_elevator',
                'floor_condition',
                'has_internet',
                'has_electricity',
                'has_air_conditioning',
                'building_condition'
            ]);
        });
    }
};
