/*
  # Allow tracking views with request_responses

  1. Schema Changes
    - Extend status check constraint to include 'viewed'
  2. Security Changes
    - Permit responders to update their own responses so upserts work
*/

-- Expand status values
ALTER TABLE request_responses DROP CONSTRAINT IF EXISTS request_responses_status_check;
ALTER TABLE request_responses ADD CONSTRAINT request_responses_status_check CHECK (status IN ('accepted','rejected','viewed'));

-- Allow users to update their own responses
DROP POLICY IF EXISTS "Users can update their responses" ON request_responses;
CREATE POLICY "Users can update their responses"
  ON request_responses
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = responder_id AND
    EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = request_responses.request_id
        AND r.status = 'open'
        AND r.requester_id != auth.uid()
        AND (
          EXISTS (
            SELECT 1 FROM request_groups rg
            JOIN group_members gm ON rg.group_id = gm.group_id
            WHERE rg.request_id = r.id AND gm.user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM request_villagers rv
            WHERE rv.request_id = r.id AND rv.user_id = auth.uid()
          )
        )
        AND NOT EXISTS (
          SELECT 1 FROM user_blocks ub
          WHERE (ub.blocker_id = auth.uid() AND ub.blocked_id = r.requester_id)
             OR (ub.blocker_id = r.requester_id AND ub.blocked_id = auth.uid())
        )
    )
  )
  WITH CHECK (
    auth.uid() = responder_id
  );
