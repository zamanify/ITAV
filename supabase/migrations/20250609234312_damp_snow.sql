/*
  # Fix Request Visibility for Many-to-Many Structure

  This migration updates the RLS policies for the requests table to properly handle
  the many-to-many relationship structure with request_groups and request_villagers.

  ## Changes Made

  1. **Updated "Users can view direct requests" policy**
     - Now properly checks if user is in request_villagers for the request
     - Maintains blocking logic to prevent blocked users from seeing requests

  2. **Updated "Users can view group requests" policy** 
     - Now properly checks if user is a member of any group that the request was sent to
     - Uses request_groups junction table to find group-targeted requests
     - Maintains blocking logic

  3. **Security**
     - All existing RLS policies remain enabled
     - Blocking relationships are respected in all policies
     - Users can only see requests they are explicitly targeted for

  ## Policy Logic

  - **Own requests**: Users can always manage their own requests
  - **Direct requests**: Users can see requests where they are listed in request_villagers
  - **Group requests**: Users can see requests sent to groups they are members of
  - **Blocking**: Blocked relationships prevent visibility in all cases
*/

-- Drop existing policies that need to be updated
DROP POLICY IF EXISTS "Users can view direct requests" ON requests;
DROP POLICY IF EXISTS "Users can view group requests" ON requests;

-- Create updated policy for direct villager requests
CREATE POLICY "Users can view direct requests" ON requests
  FOR SELECT
  TO authenticated
  USING (
    -- User is specifically targeted via request_villagers
    EXISTS (
      SELECT 1 
      FROM request_villagers rv 
      WHERE rv.request_id = requests.id 
        AND rv.user_id = auth.uid()
    )
    AND 
    -- Not blocked by requester or blocking requester
    NOT EXISTS (
      SELECT 1 
      FROM user_blocks ub 
      WHERE (
        (ub.blocker_id = auth.uid() AND ub.blocked_id = requests.requester_id) 
        OR 
        (ub.blocker_id = requests.requester_id AND ub.blocked_id = auth.uid())
      )
    )
  );

-- Create updated policy for group requests
CREATE POLICY "Users can view group requests" ON requests
  FOR SELECT
  TO authenticated
  USING (
    -- User is member of a group that the request was sent to
    EXISTS (
      SELECT 1 
      FROM request_groups rg
      JOIN group_members gm ON rg.group_id = gm.group_id
      WHERE rg.request_id = requests.id 
        AND gm.user_id = auth.uid()
    )
    AND 
    -- Not blocked by requester or blocking requester
    NOT EXISTS (
      SELECT 1 
      FROM user_blocks ub 
      WHERE (
        (ub.blocker_id = auth.uid() AND ub.blocked_id = requests.requester_id) 
        OR 
        (ub.blocker_id = requests.requester_id AND ub.blocked_id = auth.uid())
      )
    )
  );