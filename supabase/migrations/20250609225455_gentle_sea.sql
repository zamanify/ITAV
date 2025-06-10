/*
  # Migrate requests to support multiple groups and villagers

  1. Schema Changes
    - Remove group_id column from requests table
    - Create request_groups junction table for many-to-many relationship with groups
    - Create request_villagers junction table for many-to-many relationship with users

  2. Security Updates
    - Update all RLS policies to work with new junction table structure
    - Add blocking checks to prevent interactions between blocked users
    - Ensure proper access control for the new tables

  3. Performance
    - Add appropriate indexes for the new junction tables
*/

-- First, drop ALL policies that depend on the group_id column
DROP POLICY IF EXISTS "Users can view requests in their groups" ON requests;
DROP POLICY IF EXISTS "Users can create requests" ON requests;
DROP POLICY IF EXISTS "Requesters can manage their requests" ON requests;
DROP POLICY IF EXISTS "Users can respond to requests" ON request_responses;
DROP POLICY IF EXISTS "System can create transactions" ON transactions;

-- Now we can safely drop the group_id column
ALTER TABLE requests DROP COLUMN IF EXISTS group_id;

-- Create request_groups junction table
CREATE TABLE IF NOT EXISTS request_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(request_id, group_id)
);

-- Create request_villagers junction table
CREATE TABLE IF NOT EXISTS request_villagers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(request_id, user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_request_groups_request ON request_groups(request_id);
CREATE INDEX IF NOT EXISTS idx_request_groups_group ON request_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_request_villagers_request ON request_villagers(request_id);
CREATE INDEX IF NOT EXISTS idx_request_villagers_user ON request_villagers(user_id);

-- Enable RLS on new tables
ALTER TABLE request_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_villagers ENABLE ROW LEVEL SECURITY;

-- Recreate request policies with new structure
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
      AND NOT EXISTS (
        SELECT 1 FROM user_blocks ub
        WHERE (ub.blocker_id = auth.uid() AND ub.blocked_id = requests.requester_id)
        OR (ub.blocker_id = requests.requester_id AND ub.blocked_id = auth.uid())
      )
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
      AND NOT EXISTS (
        SELECT 1 FROM user_blocks ub
        WHERE (ub.blocker_id = auth.uid() AND ub.blocked_id = requests.requester_id)
        OR (ub.blocker_id = requests.requester_id AND ub.blocked_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can create requests"
  ON requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Requesters can manage their requests"
  ON requests
  FOR ALL
  TO authenticated
  USING (auth.uid() = requester_id);

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
      AND NOT EXISTS (
        SELECT 1 FROM user_blocks ub
        WHERE (ub.blocker_id = auth.uid() AND ub.blocked_id = request_villagers.user_id)
        OR (ub.blocker_id = request_villagers.user_id AND ub.blocked_id = auth.uid())
      )
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

-- Recreate request_responses policies with new structure
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
      AND NOT EXISTS (
        SELECT 1 FROM user_blocks ub
        WHERE (ub.blocker_id = auth.uid() AND ub.blocked_id = r.requester_id)
        OR (ub.blocker_id = r.requester_id AND ub.blocked_id = auth.uid())
      )
    )
  );

-- Recreate transactions policies with new structure
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