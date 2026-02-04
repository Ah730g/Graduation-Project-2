<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Porperty;
use App\Models\Post;
use App\Models\PostImage;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class TestUsersAndApartmentsSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed test users and apartments for testing ads display.
     */
    public function run(): void
    {
        // Get or create Apartment property type
        $apartmentProperty = Porperty::firstOrCreate(['name' => 'Apartment']);

        // Create 4 new users
        $users = [];
        $userData = [
            [
                'name' => 'Omar Khaled',
                'email' => 'omar.khaled@test.com',
                'password' => Hash::make('password123'),
                'role' => 'owner',
                'status' => 'active',
                'identity_status' => 'approved', // Approved so they can create posts
            ],
            [
                'name' => 'Fatima Ali',
                'email' => 'fatima.ali@test.com',
                'password' => Hash::make('password123'),
                'role' => 'owner',
                'status' => 'active',
                'identity_status' => 'approved',
            ],
            [
                'name' => 'Youssef Mahmoud',
                'email' => 'youssef.mahmoud@test.com',
                'password' => Hash::make('password123'),
                'role' => 'owner',
                'status' => 'active',
                'identity_status' => 'approved',
            ],
            [
                'name' => 'Layla Hassan',
                'email' => 'layla.hassan@test.com',
                'password' => Hash::make('password123'),
                'role' => 'owner',
                'status' => 'active',
                'identity_status' => 'approved',
            ],
        ];

        foreach ($userData as $data) {
            $user = User::firstOrCreate(
                ['email' => $data['email']],
                $data
            );
            $users[] = $user;
        }

        // Cities in Egypt for variety
        $cities = ['Cairo', 'Alexandria', 'Giza', 'Sharm El Sheikh'];
        
        // Create 4 apartments for each user (16 apartments total)
        $apartmentTemplates = [
            [
                'Title' => 'شقة فاخرة في قلب المدينة',
                'Price' => 2500,
                'Bedrooms' => 2,
                'Bathrooms' => 2,
                'Total_Size' => 110,
                'Description' => 'شقة حديثة ومريحة في موقع ممتاز، قريبة من جميع الخدمات والمواصلات.',
            ],
            [
                'Title' => 'شقة واسعة مع إطلالة رائعة',
                'Price' => 3200,
                'Bedrooms' => 3,
                'Bathrooms' => 2,
                'Total_Size' => 140,
                'Description' => 'شقة واسعة ومشمسة مع إطلالة جميلة، مناسبة للعائلات.',
            ],
            [
                'Title' => 'شقة أنيقة في منطقة هادئة',
                'Price' => 2800,
                'Bedrooms' => 2,
                'Bathrooms' => 1,
                'Total_Size' => 95,
                'Description' => 'شقة أنيقة ومفروشة بالكامل في منطقة سكنية هادئة وآمنة.',
            ],
            [
                'Title' => 'شقة عصرية مع جميع الخدمات',
                'Price' => 3500,
                'Bedrooms' => 3,
                'Bathrooms' => 3,
                'Total_Size' => 160,
                'Description' => 'شقة عصرية ومتطورة مع جميع الخدمات الحديثة والمرافق الكاملة.',
            ],
        ];

        $addresses = [
            'شارع النصر، منطقة وسط البلد',
            'شارع الجيزة، حي الزمالك',
            'شارع المعادي، منطقة المعادي',
            'شارع مصر الجديدة، حي مصر الجديدة',
        ];

        $postIndex = 0;
        foreach ($users as $userIndex => $user) {
            $city = $cities[$userIndex % count($cities)];
            
            for ($i = 0; $i < 4; $i++) {
                $template = $apartmentTemplates[$i];
                $address = $addresses[$i];
                
                // Vary coordinates slightly for each apartment
                $baseLat = ['30.0444', '31.2000', '30.0131', '27.9158'][$userIndex % 4];
                $baseLng = ['31.2357', '29.9167', '31.6949', '34.3300'][$userIndex % 4];
                $lat = (float)$baseLat + ($i * 0.01);
                $lng = (float)$baseLng + ($i * 0.01);

                $post = Post::create([
                    'user_id' => $user->id,
                    'Title' => $template['Title'],
                    'Price' => $template['Price'] + ($userIndex * 100), // Vary price slightly
                    'Address' => $address,
                    'Description' => $template['Description'],
                    'City' => $city,
                    'Bedrooms' => $template['Bedrooms'],
                    'Bathrooms' => $template['Bathrooms'],
                    'Latitude' => (string)$lat,
                    'Longitude' => (string)$lng,
                    'Type' => 'rent',
                    'porperty_id' => $apartmentProperty->id,
                    'Utilities_Policy' => $i % 2 === 0 ? 'owner' : 'tenant',
                    'Pet_Policy' => $i % 2 === 0,
                    'Income_Policy' => '3x rent',
                    'Total_Size' => $template['Total_Size'],
                    'Bus' => 5 + $i,
                    'Resturant' => 3 + $i,
                    'School' => 4 + $i,
                    'status' => 'active', // Approved by admin - will appear as ads
                    'floor_number' => $i + 1,
                    'has_elevator' => $i % 2 === 0,
                    'floor_condition' => ['excellent', 'good', 'fair', 'excellent'][$i],
                    'has_internet' => true,
                    'has_electricity' => true,
                    'has_air_conditioning' => true,
                    'building_condition' => ['excellent', 'good', 'good', 'excellent'][$i],
                ]);

                // Add image for each apartment
                PostImage::create([
                    'post_id' => $post->id,
                    'Image_URL' => '/bg.png',
                ]);

                $postIndex++;
            }
        }

        $this->command->info('Successfully created 4 test users and 16 apartments (4 for each user)!');
        $this->command->info('All apartments are approved (status: active) and will appear as ads.');
        $this->command->info('User credentials:');
        foreach ($users as $user) {
            $this->command->info("  - {$user->email} / password123");
        }
    }
}
