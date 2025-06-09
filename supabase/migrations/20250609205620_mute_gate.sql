/*
  # User Blocking System Implementation

  1. New Tables
    - `user_blocks`
      - `id` (uuid, primary key)
      - `blocker_id` (uuid, foreign key to users)
      - `blocked_id` (uuid, foreign key to users)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `user_blocks` table
    - Add policies for users to manage their own blocks
    - Add unique constraint to prevent duplicate blocks

  3. Changes
    - Remove 'blocked' status from villager_connections constraint
    - Update constraint to only allow: pending, accepted, rejected
*/

-- Create user_blocks table
CREATE TABLE IF NOT EXISTS user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint to prevent duplicate blocks
ALTER TABLE user_blocks 
ADD CONSTRAINT user_blocks_blocker_blocked_unique 
UNIQUE (blocker_id, blocked_id);

-- Add constraint to prevent self-blocking
ALTER TABLE user_blocks 
ADD CONSTRAINT user_blocks_no_self_block 
CHECK (blocker_id != blocked_id);

-- Enable RLS
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_blocks
CREATE POLICY "Users can view blocks they created or blocks against them"
  ON user_blocks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

CREATE POLICY "Users can create blocks"
  ON user_blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete their own blocks"
  ON user_blocks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = blocker_id);

-- Update villager_connections constraint to remove 'blocked' status
ALTER TABLE villager_connections 
DROP CONSTRAINT IF EXISTS villager_connections_status_check;

ALTER TABLE villager_connections 
ADD CONSTRAINT villager_connections_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text]));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);

-- Create helper function to check if user A has blocked user B
CREATE OR REPLACE FUNCTION is_user_blocked(blocker_user_id uuid, blocked_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_blocks 
    WHERE blocker_id = blocker_user_id 
    AND blocked_id = blocked_user_id
  );
$$;

-- Create helper function to get non-blocked villager connections
CREATE OR REPLACE FUNCTION get_non_blocked_connections(user_id uuid)
RETURNS TABLE (
  connection_id uuid,
  other_user_id uuid,
  status text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    vc.id as connection_id,
    CASE 
      WHEN vc.sender_id = user_id THEN vc.receiver_id
      ELSE vc.sender_id
    END as other_user_id,
    vc.status,
    vc.created_at
  FROM villager_connections vc
  WHERE (vc.sender_id = user_id OR vc.receiver_id = user_id)
  AND vc.status IN ('pending', 'accepted', 'rejected')
  AND NOT EXISTS (
    SELECT 1 FROM user_blocks ub1
    WHERE ub1.blocker_id = user_id 
    AND ub1.blocked_id = CASE 
      WHEN vc.sender_id = user_id THEN vc.receiver_id
      ELSE vc.sender_id
    END
  )
  AND NOT EXISTS (
    SELECT 1 FROM user_blocks ub2
    WHERE ub2.blocked_id = user_id 
    AND ub2.blocker_id = CASE 
      WHEN vc.sender_id = user_id THEN vc.receiver_id
      ELSE vc.sender_id
    END
  );
$$;