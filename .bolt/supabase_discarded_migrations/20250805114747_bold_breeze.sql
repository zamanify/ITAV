```sql
/*
  # Add is_seen column to villager_connections table

  1. Schema Changes
    - Add `is_seen` boolean column to `villager_connections` table
    - Default value is `FALSE`

  2. RLS Policies
    - Add policy to allow the `receiver_id` to update the `is_seen` column for their connections.
*/

-- Add is_seen column to villager_connections table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'villager_connections' AND column_name = 'is_seen'
  ) THEN
    ALTER TABLE villager_connections ADD COLUMN is_seen BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add RLS policy to allow receiver to mark connection as seen
CREATE POLICY "Receiver can mark connection as seen"
  ON villager_connections
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Update the get_non_blocked_connections function to include the is_seen column
CREATE OR REPLACE FUNCTION get_non_blocked_connections(user_id uuid)
RETURNS TABLE (
  connection_id uuid,
  other_user_id uuid,
  status text,
  created_at timestamptz,
  is_seen boolean
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
    vc.created_at,
    vc.is_seen
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
```