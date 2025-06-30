/*
  # Add Request/Offer Message Tags

  1. Schema Changes
    - Add `via_request_id` column to `messages` table (uuid, nullable, references requests)
    - Add `via_request_title` column to `messages` table (text, nullable)
    - Add `via_is_offer` column to `messages` table (boolean, nullable)
  
  2. Purpose
    - Enable tagging messages sent through requests/offers
    - Show context in chat about which request/offer a message is related to
    - Improve user experience by providing message context
*/

-- Add columns to messages table for request/offer tagging
ALTER TABLE messages ADD COLUMN IF NOT EXISTS via_request_id uuid REFERENCES requests(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS via_request_title text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS via_is_offer boolean;

-- Update the conversation list function to include request/offer information
CREATE OR REPLACE FUNCTION get_conversation_list(user_id uuid)
RETURNS TABLE (
  partner_id uuid,
  partner_name text,
  latest_message text,
  latest_message_time timestamptz,
  is_latest_from_me boolean,
  unread_count bigint,
  via_group_name text,
  via_request_title text,
  via_is_offer boolean
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
      g.name as group_name,
      m.via_request_title,
      m.via_is_offer
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
    lm.group_name as via_group_name,
    lm.via_request_title,
    lm.via_is_offer
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