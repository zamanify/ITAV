/*
  # Fix RLS policies to allow user lookup function

  1. Changes
    - Update users table RLS policies to allow the lookup function to work
    - Add specific policy for the get_user_id_by_phone function
    - Ensure authenticated users can find other users for connection purposes

  2. Security
    - Maintain data privacy while allowing necessary lookups
    - Only expose minimal information needed for connections
*/

-- Drop the overly restrictive policy that was blocking the lookup
DROP POLICY IF EXISTS "Users can read other users basic info" ON users;

-- Create a more specific policy that allows reading basic user info for connections
CREATE POLICY "Users can read basic info for connections"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Users can always read their own data
    auth.uid() = id 
    OR
    -- Users can read basic info of users they're connected to
    EXISTS (
      SELECT 1 FROM villager_connections
      WHERE (
        (sender_id = auth.uid() AND receiver_id = users.id) OR
        (receiver_id = auth.uid() AND sender_id = users.id)
      ) AND status = 'accepted'
    )
    OR
    -- Users can read basic info of users in their groups
    EXISTS (
      SELECT 1 FROM (group_members gm1
        JOIN group_members gm2 ON (gm1.group_id = gm2.group_id))
      WHERE (gm1.user_id = auth.uid() AND gm2.user_id = users.id)
    )
  );

-- Add a policy specifically for user insertion during signup
CREATE POLICY "Users can insert their own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Update the get_user_id_by_phone function to be more explicit about security
CREATE OR REPLACE FUNCTION public.get_user_id_by_phone(p_phone_number text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_uuid uuid;
BEGIN
    -- This function bypasses RLS to allow user lookup for connection purposes
    -- It only returns the user ID, no other sensitive information
    SELECT id INTO user_uuid
    FROM public.users
    WHERE phone_number = p_phone_number;

    RETURN user_uuid;
END;
$$;

-- Ensure the function has proper permissions
REVOKE ALL ON FUNCTION public.get_user_id_by_phone(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_phone(text) TO authenticated;