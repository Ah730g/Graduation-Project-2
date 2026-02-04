<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\SignupRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function signup(SignupRequest $request)
    {
        try {
            $data = $request->validated();
            $user = User::create([
                "name" => $data["name"],
                "email" => $data["email"],
                "password" => bcrypt($data["password"]),
                "role" => "tenant",
                "status" => "active"
            ]);
            auth()->login($user);
            $token = $user->createToken("user_token")->plainTextToken;
            $userDTO = new UserResource($user);
            return response(compact("userDTO","token"),201);
        } catch (\Illuminate\Database\QueryException $e) {
            \Log::error('Signup database error: ' . $e->getMessage());
            if (str_contains($e->getMessage(), '2002') || str_contains($e->getMessage(), 'refused')) {
                return response([
                    'message' => 'Database connection failed. Please ensure MySQL is running in XAMPP.',
                    'error' => 'MySQL server is not running or not accessible'
                ], 503);
            }
            return response([
                'message' => 'An error occurred during signup',
                'error' => $e->getMessage()
            ], 500);
        } catch (\Exception $e) {
            \Log::error('Signup error: ' . $e->getMessage());
            return response([
                'message' => 'An error occurred during signup',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    public function login(LoginRequest $request)
    {
        try {
            $data = $request->validated();
            $user = User::where("email",$data["email"])->first();
            if(!$user)
                return response(['message' => "User Not Found"],404);
            if(!Hash::check($data["password"],$user->password))
                return response(["message" => "password is not correct"],404);
            auth()->login($user);
            $userDTO = new UserResource($user);
            $token = $user->createToken("user_token")->plainTextToken;
            return response(compact("userDTO","token"),200);
        } catch (\Exception $e) {
            \Log::error('Login error: ' . $e->getMessage());
            return response(['message' => 'An error occurred during login', 'error' => $e->getMessage()], 500);
        }
    }
    public function Logout(Request $request)
    {
        /** @var \app\Models\User $user */
        $user = $request->user();
        $user->tokens()->delete();
        return response("",200);
    }
}
