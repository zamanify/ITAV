/*
  # Add profile image URL to users table

  1. Schema Changes
    - Add `profile_image_url` column to `users` table
    - Column is optional (nullable) to allow existing users without images
    - Column stores the public URL of the user's profile image from Supabase Storage

  2. Security
    - No RLS policy changes needed as existing policies will cover the new column
    - Users can read and update their own profile image URL through existing policies

  3. Notes
    - This enables persistent storage of user profile images
    - Images will be stored in Supabase Storage and URLs stored in this column
    - Existing users will have NULL values until they upload a profile image
*/

-- Add profile_image_url column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'profile_image_url'
  ) THEN
    ALTER TABLE users ADD COLUMN profile_image_url text;
  END IF;
END $$;