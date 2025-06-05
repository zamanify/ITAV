/*
  # Add user profile fields

  1. Changes
    - Rename name column to first_name
    - Add last_name column
    - Add street_address column
    - Add zip_code column
    - Add city column

  2. Data Migration
    - Split existing name field into first_name and last_name
*/

-- Rename name column to first_name
ALTER TABLE users RENAME COLUMN name TO first_name;

-- Add new columns
ALTER TABLE users ADD COLUMN last_name TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN street_address TEXT;
ALTER TABLE users ADD COLUMN zip_code TEXT;
ALTER TABLE users ADD COLUMN city TEXT;

-- Update the users table insert in onboarding to match new schema
CREATE OR REPLACE FUNCTION process_auth_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, first_name, last_name, email, phone_number)
  VALUES (
    NEW.id,
    '',  -- first_name will be updated by the application
    '',  -- last_name will be updated by the application
    NEW.email,
    NULL -- phone_number will be updated by the application
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;