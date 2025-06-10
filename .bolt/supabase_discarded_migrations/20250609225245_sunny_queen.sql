/*
  # Update Request RLS Policies

  1. Policy Updates
    - Update existing request policies to work without group_id column
    - Add policies for new junction tables
    - Ensure proper access control for multi-group and multi-villager requests

  2. Security
    - Users can view requests they created
    - Users can view requests in groups they belong to
    - Users can view requests sent directly to them
    - Users can create associations only for their own requests
*/

-- Drop existing request policies that reference group_id
DROP POLICY IF EXISTS "Users can view requests in their groups" ON requests;
DROP POLICY IF EXISTS "Users can create requests" ON requests;

-- Create updated request policies
CREATE POLICY "Users can view their own requests"
  ON requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = requester_id);

CREATE POLICY "Users can view requests in their groups"
  ON requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM request_groups rg
      JOIN group_members gm ON rg.group_id = gm.group_id
      WHERE rg.request_id = requests.id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view requests sent to them"
  ON requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM request_villagers rv
      WHERE rv.request_id = requests.id
      AND rv.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create requests"
  ON requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

-- Add policies for request_groups table
CREATE POLICY "Users can view request groups for accessible requests"
  ON request_groups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = request_groups.request_id
      AND (
        r.requester_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM group_members gm
          WHERE gm.group_id = request_groups.group_id
          AND gm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create request groups for their requests"
  ON request_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = request_groups.request_id
      AND r.requester_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = request_groups.group_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete request groups for their requests"
  ON request_groups
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = request_groups.request_id
      AND r.requester_id = auth.uid()
    )
  );

-- Add policies for request_villagers table
CREATE POLICY "Users can view request villagers for accessible requests"
  ON request_villagers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = request_villagers.request_id
      AND (
        r.requester_id = auth.uid()
        OR request_villagers.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create request villagers for their requests"
  ON request_villagers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = request_villagers.request_id
      AND r.requester_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM villager_connections vc
      WHERE (
        (vc.sender_id = auth.uid() AND vc.receiver_id = request_villagers.user_id)
        OR (vc.receiver_id = auth.uid() AND vc.sender_id = request_villagers.user_id)
      )
      AND vc.status = 'accepted'
    )
  );

CREATE POLICY "Users can delete request villagers for their requests"
  ON request_villagers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = request_villagers.request_id
      AND r.requester_id = auth.uid()
    )
  );

-- Update request_responses policies to work with new structure
DROP POLICY IF EXISTS "Users can respond to requests" ON request_responses;

CREATE POLICY "Users can respond to requests"
  ON request_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = responder_id
    AND EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = request_responses.request_id
      AND r.status = 'open'
      AND r.requester_id != auth.uid()
      AND (
        -- Request is in a group the user belongs to
        EXISTS (
          SELECT 1 FROM request_groups rg
          JOIN group_members gm ON rg.group_id = gm.group_id
          WHERE rg.request_id = r.id
          AND gm.user_id = auth.uid()
        )
        OR
        -- Request is sent directly to the user
        EXISTS (
          SELECT 1 FROM request_villagers rv
          WHERE rv.request_id = r.id
          AND rv.user_id = auth.uid()
        )
      )
    )
  );

-- Update transactions policies to work with new structure
DROP POLICY IF EXISTS "System can create transactions" ON transactions;

CREATE POLICY "System can create transactions"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = transactions.related_request
      AND r.status = 'completed'
      AND r.minutes_logged = transactions.minutes
      AND (
        (auth.uid() = r.requester_id AND auth.uid() = transactions.from_user)
        OR EXISTS (
          SELECT 1 FROM request_responses rr
          WHERE rr.request_id = r.id
          AND rr.responder_id = auth.uid()
          AND rr.status = 'accepted'
          AND auth.uid() = transactions.to_user
        )
      )
    )
  );