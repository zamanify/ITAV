/*
  # Fix RLS policies for requests table

  1. Security Changes
    - Drop existing problematic RLS policies that cause infinite recursion
    - Create new, simplified RLS policies without circular dependencies
    - Ensure proper access control for requests table

  2. Policy Changes
    - Users can view their own requests
    - Users can view requests in groups they belong to (via request_groups)
    - Users can view requests sent directly to them (via request_villagers)
    - Users can manage their own requests
    - Block functionality is preserved in all policies
*/

-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Requesters can manage their requests" ON requests;
DROP POLICY IF EXISTS "Users can create requests" ON requests;
DROP POLICY IF EXISTS "Users can view requests in their groups" ON requests;
DROP POLICY IF EXISTS "Users can view requests sent to them" ON requests;
DROP POLICY IF EXISTS "Users can view their own requests" ON requests;

-- Create new, simplified policies without circular dependencies

-- Policy 1: Users can manage their own requests
CREATE POLICY "Users can manage own requests"
  ON requests
  FOR ALL
  TO authenticated
  USING (auth.uid() = requester_id)
  WITH CHECK (auth.uid() = requester_id);

-- Policy 2: Users can view requests in groups they belong to
CREATE POLICY "Users can view group requests"
  ON requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM request_groups rg
      JOIN group_members gm ON rg.group_id = gm.group_id
      WHERE rg.request_id = requests.id
        AND gm.user_id = auth.uid()
        AND NOT EXISTS (
          SELECT 1
          FROM user_blocks ub
          WHERE (
            (ub.blocker_id = auth.uid() AND ub.blocked_id = requests.requester_id)
            OR
            (ub.blocker_id = requests.requester_id AND ub.blocked_id = auth.uid())
          )
        )
    )
  );

-- Policy 3: Users can view requests sent directly to them
CREATE POLICY "Users can view direct requests"
  ON requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM request_villagers rv
      WHERE rv.request_id = requests.id
        AND rv.user_id = auth.uid()
        AND NOT EXISTS (
          SELECT 1
          FROM user_blocks ub
          WHERE (
            (ub.blocker_id = auth.uid() AND ub.blocked_id = requests.requester_id)
            OR
            (ub.blocker_id = requests.requester_id AND ub.blocked_id = auth.uid())
          )
        )
    )
  );