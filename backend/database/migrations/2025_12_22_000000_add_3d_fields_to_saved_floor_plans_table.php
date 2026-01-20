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
        Schema::table('saved_floor_plans', function (Blueprint $table) {
            $table->json('room_heights')->nullable()->after('layout_data'); // ارتفاعات الغرف
            $table->json('wall_materials')->nullable()->after('room_heights'); // مواد الجدران
            $table->json('floor_materials')->nullable()->after('wall_materials'); // مواد الأرضيات
            $table->decimal('ceiling_height', 5, 2)->default(2.70)->after('floor_materials'); // ارتفاع السقف الافتراضي (بالأمتار)
            $table->json('view_3d_settings')->nullable()->after('ceiling_height'); // إعدادات العرض 3D
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('saved_floor_plans', function (Blueprint $table) {
            $table->dropColumn([
                'room_heights',
                'wall_materials',
                'floor_materials',
                'ceiling_height',
                'view_3d_settings'
            ]);
        });
    }
};

