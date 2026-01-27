<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Porperty;
use Illuminate\Support\Facades\Log;

class PropertyController extends Controller
{
    public function index()
    {
        try {
            $properties = Porperty::all();
            return response()->json($properties);
        } catch (\Exception $e) {
            Log::error('Error in PropertyController::index: ' . $e->getMessage());
            // Return empty array if table doesn't exist or there's an error
            return response()->json([], 200);
        }
    }
}
