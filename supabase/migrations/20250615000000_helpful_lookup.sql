/*
  # Expand user visibility for invites and phone lookup helper

  1. Policy Changes
    - Allow reading basic user info when a connection exists with status
      'pending' or 'accepted'.

  2. New Helper Function
    - `get_users_by_phones` returns ID and names for a list of phone numbers.
      Runs with SECURITY DEFINER to bypass RLS and only exposes minimal info.
*/

-- Replace the existing policy so pending invites reveal basic info
DROP POLICY IF EXISTS "Users can read basic info for connections" ON users;

CREATE POLICY "Users can read basic info for connections"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM villager_connections
      WHERE (
        (sender_id = auth.uid() AND receiver_id = users.id) OR
        (receiver_id = auth.uid() AND sender_id = users.id)
      ) AND status IN ('pending', 'accepted')
    )
    OR EXISTS (
      SELECT 1 FROM (group_members gm1
        JOIN group_members gm2 ON gm1.group_id = gm2.group_id)
      WHERE gm1.user_id = auth.uid() AND gm2.user_id = users.id
    )
  );

-- Helper function for phonebook lookup
CREATE OR REPLACE FUNCTION public.get_users_by_phones(p_phone_numbers text[])
RETURNS TABLE(id uuid, first_name text, last_name text, phone_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT id, first_name, last_name, phone_number
  FROM public.users
  WHERE phone_number = ANY(p_phone_numbers);
END;
$$;

REVOKE ALL ON FUNCTION public.get_users_by_phones(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_users_by_phones(text[]) TO authenticated;
