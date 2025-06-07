/*
  # Create User Lookup Function

  1. New Functions
    - `get_user_id_by_phone` - Securely finds user ID by phone number
      - Uses SECURITY DEFINER to bypass RLS for lookup
      - Returns only the user ID, not sensitive data
      - Allows authenticated users to find others for connection requests

  2. Security
    - Function runs with elevated privileges to bypass RLS
    - Only returns user ID, no other personal information
    - Grants execute permission to authenticated users only
*/

CREATE OR REPLACE FUNCTION public.get_user_id_by_phone(p_phone_number text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to run with the privileges of the function owner, bypassing RLS
AS $$
DECLARE
    user_uuid uuid;
BEGIN
    SELECT id INTO user_uuid
    FROM public.users
    WHERE phone_number = p_phone_number;

    RETURN user_uuid;
END;
$$;

-- Grant execution rights to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_id_by_phone(text) TO authenticated;