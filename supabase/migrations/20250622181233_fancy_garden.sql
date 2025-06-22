/*
  # Create Messages Table and RLS Policies

  1. New Tables
    - `messages`
      - `id` (uuid, primary key)
      - `sender_id` (uuid, foreign key to users)
      - `receiver_id` (uuid, foreign key to users)
      - `via_group_id` (uuid, nullable, foreign key to groups)
      - `message_text` (text, not null)
      - `is_read` (boolean, default false)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `messages` table
    - Add policies for users to manage their own messages
    - Prevent messaging blocked users

  3. Performance
    - Add indexes for efficient querying
*/

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  via_group_id uuid NULL REFERENCES groups(id) ON DELETE SET NULL,
  message_text text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_via_group ON messages(via_group_id);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages
CREATE POLICY "Users can view their own messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );

CREATE POLICY "Users can send messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND sender_id != receiver_id
    AND NOT EXISTS (
      SELECT 1 FROM user_blocks ub
      WHERE (ub.blocker_id = auth.uid() AND ub.blocked_id = receiver_id)
         OR (ub.blocker_id = receiver_id AND ub.blocked_id = auth.uid())
    )
  );

CREATE POLICY "Users can mark their received messages as read"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Helper function to get conversation partners with latest message
CREATE OR REPLACE FUNCTION get_conversation_list(user_id uuid)
RETURNS TABLE (
  partner_id uuid,
  partner_name text,
  latest_message text,
  latest_message_time timestamptz,
  is_latest_from_me boolean,
  unread_count bigint,
  via_group_name text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH latest_messages AS (
    SELECT DISTINCT ON (
      CASE 
        WHEN m.sender_id = user_id THEN m.receiver_id
        ELSE m.sender_id
      END
    )
      CASE 
        WHEN m.sender_id = user_id THEN m.receiver_id
        ELSE m.sender_id
      END as partner_id,
      m.message_text,
      m.created_at,
      m.sender_id = user_id as is_from_me,
      g.name as group_name
    FROM messages m
    LEFT JOIN groups g ON m.via_group_id = g.id
    WHERE m.sender_id = user_id OR m.receiver_id = user_id
    ORDER BY 
      CASE 
        WHEN m.sender_id = user_id THEN m.receiver_id
        ELSE m.sender_id
      END,
      m.created_at DESC
  ),
  unread_counts AS (
    SELECT 
      m.sender_id as partner_id,
      COUNT(*) as unread_count
    FROM messages m
    WHERE m.receiver_id = user_id AND m.is_read = false
    GROUP BY m.sender_id
  )
  SELECT 
    lm.partner_id,
    u.first_name || ' ' || u.last_name as partner_name,
    lm.message_text as latest_message,
    lm.created_at as latest_message_time,
    lm.is_from_me as is_latest_from_me,
    COALESCE(uc.unread_count, 0) as unread_count,
    lm.group_name as via_group_name
  FROM latest_messages lm
  JOIN users u ON u.id = lm.partner_id
  LEFT JOIN unread_counts uc ON uc.partner_id = lm.partner_id
  WHERE NOT EXISTS (
    SELECT 1 FROM user_blocks ub
    WHERE (ub.blocker_id = user_id AND ub.blocked_id = lm.partner_id)
       OR (ub.blocker_id = lm.partner_id AND ub.blocked_id = user_id)
  )
  ORDER BY lm.created_at DESC;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_conversation_list(uuid) TO authenticated;