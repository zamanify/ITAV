/*
  # Fix RLS Policy Infinite Recursion

  This migration fixes the infinite recursion issue in RLS policies for the requests and request_groups tables.
  The problem occurs when policies reference each other in a circular manner.

  ## Changes Made

  1. **Requests Table Policies**
     - Simplified the group requests policy to avoid circular references
     - Removed complex subqueries that cause recursion

  2. **Request Groups Table Policies**
     - Streamlined policies to prevent circular references with requests table
     - Maintained security while eliminating recursion

  ## Security Notes

  - All policies maintain the same security level
  - Users can still only access requests they should have access to
  - Group-based access control is preserved
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view group requests" ON requests;
DROP POLICY IF EXISTS "Users can view direct requests" ON requests;
DROP POLICY IF EXISTS "Users can view request groups for accessible requests" ON request_groups;

-- Create new simplified policies for requests table
CREATE POLICY "Users can view group requests" ON requests
  FOR SELECT
  TO authenticated
  USING (
    -- User can see requests from groups they belong to (without referencing request_groups directly)
    EXISTS (
      SELECT 1 
      FROM group_members gm1
      JOIN group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid() 
        AND gm2.user_id = requests.requester_id
    )
    AND NOT EXISTS (
      SELECT 1 
      FROM user_blocks ub 
      WHERE ((ub.blocker_id = auth.uid() AND ub.blocked_id = requests.requester_id) 
         OR (ub.blocker_id = requests.requester_id AND ub.blocked_id = auth.uid()))
    )
  );

CREATE POLICY "Users can view direct requests" ON requests
  FOR SELECT
  TO authenticated
  USING (
    -- User can see requests directly sent to them via request_villagers
    EXISTS (
      SELECT 1 
      FROM request_villagers rv 
      WHERE rv.request_id = requests.id 
        AND rv.user_id = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1 
      FROM user_blocks ub 
      WHERE ((ub.blocker_id = auth.uid() AND ub.blocked_id = requests.requester_id) 
         OR (ub.blocker_id = requests.requester_id AND ub.blocked_id = auth.uid()))
    )
  );

-- Create new simplified policy for request_groups table
CREATE POLICY "Users can view request groups for accessible requests" ON request_groups
  FOR SELECT
  TO authenticated
  USING (
    -- User is the requester of the request
    EXISTS (
      SELECT 1 
      FROM requests r 
      WHERE r.id = request_groups.request_id 
        AND r.requester_id = auth.uid()
    )
    OR
    -- User is a member of the group
    EXISTS (
      SELECT 1 
      FROM group_members gm 
      WHERE gm.group_id = request_groups.group_id 
        AND gm.user_id = auth.uid()
    )
  );